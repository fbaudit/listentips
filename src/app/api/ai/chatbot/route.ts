import { NextRequest, NextResponse } from "next/server";
import { getCompanyAIClient } from "@/lib/ai/client";
import type { AIMessage, AIFileRef } from "@/lib/ai/client";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadToGemini,
  getGeminiApiKey,
  isGeminiFileExpired,
} from "@/lib/ai/gemini-files";

const MAX_DOC_LENGTH = 3000;

export async function POST(request: NextRequest) {
  try {
    const { companyCode, message, history } = await request.json();

    if (!companyCode || !message) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get company info and chatbot settings
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, use_chatbot, ai_provider")
      .eq("company_code", companyCode)
      .eq("is_active", true)
      .single();

    if (!company || !company.use_chatbot) {
      return NextResponse.json({ error: "챗봇 기능이 비활성화되어 있습니다" }, { status: 403 });
    }

    // Get company documents
    const { data: documents } = await supabase
      .from("company_documents")
      .select("id, file_name, content_text, mime_type, gemini_file_uri, gemini_file_name, gemini_uploaded_at")
      .eq("company_id", company.id)
      .limit(10);

    const aiClient = await getCompanyAIClient(company.id);

    // Gemini: fileData 파트로 전달 (File API 방식)
    const useGeminiFiles = (company.ai_provider === "gemini" || !company.ai_provider) && documents?.length;

    if (useGeminiFiles) {
      const fileRefs = await resolveGeminiFiles(supabase, documents);

      if (fileRefs.length > 0) {
        const systemPrompt = CHATBOT_SYSTEM_PROMPT
          .replace("{{company_name}}", company.name)
          .replace("{{documents}}", "파일 참조를 통해 문서가 제공됩니다.");

        const chatMessages: AIMessage[] = [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-20).map((h: { role: string; content: string }) => ({
            role: (h.role === "user" ? "user" : "assistant") as AIMessage["role"],
            content: h.content,
          })),
          { role: "user" as const, content: message },
        ];

        const response = await aiClient.generateChatWithFiles(chatMessages, fileRefs);
        const text = response.text || "죄송합니다. 응답을 생성할 수 없습니다.";
        return NextResponse.json({ reply: text });
      }
    }

    // ── 텍스트 삽입 방식 (OpenAI/Claude 폴백) ──
    const documentContext = documents?.length
      ? documents.map((d) => {
          const text = (d.content_text || "").slice(0, MAX_DOC_LENGTH);
          return `[${d.file_name || "문서"}]\n${text}`;
        }).join("\n\n---\n\n")
      : "회사 정책 문서가 등록되지 않았습니다.";

    const systemPrompt = CHATBOT_SYSTEM_PROMPT
      .replace("{{company_name}}", company.name)
      .replace("{{documents}}", documentContext);

    const chatMessages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20).map((h: { role: string; content: string }) => ({
        role: (h.role === "user" ? "user" : "assistant") as AIMessage["role"],
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await aiClient.generateChat(chatMessages);
    const text = response.text || "죄송합니다. 응답을 생성할 수 없습니다.";
    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Chatbot error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `챗봇 오류: ${msg}` }, { status: 500 });
  }
}

/**
 * 문서 목록에서 유효한 Gemini 파일 참조를 확인하고,
 * 만료된 파일은 content_text로 재업로드합니다.
 */
async function resolveGeminiFiles(
  supabase: ReturnType<typeof createAdminClient>,
  documents: Array<{
    id: string;
    file_name: string;
    content_text: string | null;
    mime_type: string;
    gemini_file_uri: string | null;
    gemini_file_name: string | null;
    gemini_uploaded_at: string | null;
  }>
): Promise<AIFileRef[]> {
  const fileRefs: AIFileRef[] = [];
  let geminiKey: string;

  try {
    geminiKey = getGeminiApiKey();
  } catch {
    return fileRefs;
  }

  for (const doc of documents) {
    try {
      // 유효한 파일 참조가 있고 만료되지 않았으면 그대로 사용
      if (doc.gemini_file_uri && !isGeminiFileExpired(doc.gemini_uploaded_at)) {
        fileRefs.push({
          uri: doc.gemini_file_uri,
          mimeType: doc.mime_type || "text/plain",
        });
        continue;
      }

      // 만료되었거나 아직 업로드되지 않은 경우 → content_text로 재업로드
      if (doc.content_text) {
        const mimeType = doc.mime_type || "text/plain";
        const result = await uploadToGemini(geminiKey, doc.file_name, doc.content_text, mimeType);

        await supabase
          .from("company_documents")
          .update({
            gemini_file_uri: result.uri,
            gemini_file_name: result.name,
            gemini_uploaded_at: new Date().toISOString(),
          })
          .eq("id", doc.id);

        fileRefs.push({ uri: result.uri, mimeType });
      }
    } catch (err) {
      console.warn(`Gemini file resolve failed for ${doc.file_name}:`, err);
    }
  }

  return fileRefs;
}
