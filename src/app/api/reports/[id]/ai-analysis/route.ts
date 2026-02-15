import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { getCompanyAIClient } from "@/lib/ai/client";
import {
  REPORT_SUMMARY_PROMPT,
  VIOLATION_ANALYSIS_PROMPT,
  INVESTIGATION_PLAN_PROMPT,
  INVESTIGATION_REPORT_PROMPT,
  QUESTIONNAIRE_PROMPT,
} from "@/lib/ai/prompts";
import { getCompanyDataKey, decryptWithKey, isEncrypted } from "@/lib/utils/data-encryption";

type AnalysisType = "summary" | "violation" | "investigation_plan" | "questionnaire" | "investigation_report";

const VALID_TYPES: AnalysisType[] = ["summary", "violation", "investigation_plan", "questionnaire", "investigation_report"];

const PROMPT_MAP: Record<AnalysisType, string> = {
  summary: REPORT_SUMMARY_PROMPT,
  violation: VIOLATION_ANALYSIS_PROMPT,
  investigation_plan: INVESTIGATION_PLAN_PROMPT,
  questionnaire: QUESTIONNAIRE_PROMPT,
  investigation_report: INVESTIGATION_REPORT_PROMPT,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const analysisType = body.analysisType as AnalysisType;

    if (!analysisType || !VALID_TYPES.includes(analysisType)) {
      return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 });
    }

    // Verify access — company admin or super admin only
    const access = await verifyReportAccess(request, id);
    if (!access.authorized || access.role === "reporter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch report data
    const { data: report, error } = await supabase
      .from("reports")
      .select(`
        id, report_number, title, content, company_id,
        who_field, what_field, when_field, where_field, why_field, how_field
      `)
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

    if (isEncrypted(title) || isEncrypted(content)) {
      return NextResponse.json(
        { error: "제보 내용이 암호화되어 있습니다. 암호화 키를 먼저 입력해주세요." },
        { status: 400 }
      );
    }

    // Get AI client for this company
    const ai = await getCompanyAIClient(report.company_id);

    // Build prompt with placeholders replaced
    const prompt = PROMPT_MAP[analysisType]
      .replace("{report_number}", report.report_number || "")
      .replace("{title}", title || "")
      .replace("{content}", content || "")
      .replace("{who_field}", report.who_field || "정보 없음")
      .replace("{what_field}", report.what_field || "정보 없음")
      .replace("{when_field}", report.when_field || "정보 없음")
      .replace("{where_field}", report.where_field || "정보 없음")
      .replace("{why_field}", report.why_field || "정보 없음")
      .replace("{how_field}", report.how_field || "정보 없음");

    const response = await ai.generateContent(prompt);

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.text };
    } catch {
      result = { raw: response.text };
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("AI analysis error:", err);
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `AI 분석 중 오류가 발생했습니다: ${msg}` }, { status: 500 });
  }
}
