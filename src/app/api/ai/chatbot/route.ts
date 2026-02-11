import { NextRequest, NextResponse } from "next/server";
import { getCompanyAIClient } from "@/lib/ai/client";
import type { AIMessage } from "@/lib/ai/client";
import { CHATBOT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("id, company_name, use_chatbot")
      .eq("company_code", companyCode)
      .eq("is_active", true)
      .single();

    if (!company || !company.use_chatbot) {
      return NextResponse.json({ error: "챗봇 기능이 비활성화되어 있습니다" }, { status: 403 });
    }

    // Get company documents for context
    const { data: documents } = await supabase
      .from("company_documents")
      .select("title, content")
      .eq("company_id", company.id)
      .eq("is_active", true)
      .limit(5);

    const documentContext = documents?.length
      ? documents.map((d) => `[${d.title}]\n${d.content}`).join("\n\n---\n\n")
      : "회사 정책 문서가 등록되지 않았습니다.";

    const systemPrompt = CHATBOT_SYSTEM_PROMPT
      .replace("{{company_name}}", company.company_name)
      .replace("{{documents}}", documentContext);

    const aiClient = await getCompanyAIClient(company.id);

    const chatMessages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: { role: string; content: string }) => ({
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
    return NextResponse.json({ error: "챗봇 응답 중 오류가 발생했습니다" }, { status: 500 });
  }
}
