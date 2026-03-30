import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { getCompanyAIClient } from "@/lib/ai/client";
import { COMMENT_AUTO_REPLY_PROMPT } from "@/lib/ai/prompts";
import { getCompanyDataKey, decryptWithKey, isEncrypted } from "@/lib/utils/data-encryption";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const comment = body.comment as string;

    if (!comment?.trim()) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    // Verify access — company admin or super admin only
    const access = await verifyReportAccess(request, id);
    if (!access.authorized || access.role === "reporter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch report
    const { data: report, error } = await supabase
      .from("reports")
      .select("id, title, content, company_id")
      .eq("id", access.reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Decrypt if encrypted
    let title = report.title as string;
    let content = report.content as string;

    const encKeyHeader = request.headers.get("x-encryption-key");
    const dataKey = encKeyHeader || await getCompanyDataKey(report.company_id);

    if (dataKey) {
      if (isEncrypted(title)) {
        try { title = decryptWithKey(title, dataKey); } catch { title = ""; }
      }
      if (isEncrypted(content)) {
        try { content = decryptWithKey(content, dataKey); } catch { content = ""; }
      }
    }

    // Check for custom prompt
    let promptTemplate = COMMENT_AUTO_REPLY_PROMPT;
    const { data: customPrompt } = await supabase
      .from("company_ai_prompts")
      .select("prompt_template")
      .eq("company_id", report.company_id)
      .eq("prompt_type", "auto_reply")
      .single();

    if (customPrompt?.prompt_template) {
      promptTemplate = customPrompt.prompt_template;
    }

    // Get AI client
    const ai = await getCompanyAIClient(report.company_id);

    // Strip HTML tags from content for prompt
    const plainContent = content.replace(/<[^>]*>/g, "");

    const prompt = promptTemplate
      .replace("{title}", title || "")
      .replace("{content}", plainContent || "")
      .replace("{comment}", comment);

    const response = await ai.generateContent(prompt);

    // Parse JSON response
    let result;
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: response.text };
    } catch {
      result = { reply: response.text };
    }

    return NextResponse.json({ reply: result.reply || response.text });
  } catch (err) {
    console.error("Auto-reply error:", err);
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: "AI 답변 생성 중 오류가 발생했습니다" }, { status: 500 });
  }
}
