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
  DEIDENTIFICATION_PROMPT,
} from "@/lib/ai/prompts";
import { getCompanyDataKey, decryptWithKey, isEncrypted } from "@/lib/utils/data-encryption";
import { regexDeidentify } from "@/lib/utils/deidentify-regex";
import type { DeidentifiedData } from "@/types/database";

type AnalysisType = "deidentification" | "summary" | "violation" | "investigation_plan" | "questionnaire" | "investigation_report";

const VALID_TYPES: AnalysisType[] = ["deidentification", "summary", "violation", "investigation_plan", "questionnaire", "investigation_report"];

// 회사 문서를 참조해야 하는 분석 유형
const DOCUMENT_AWARE_TYPES: AnalysisType[] = ["violation", "investigation_plan", "questionnaire", "investigation_report"];

const MAX_DOC_LENGTH = 3000;

const PROMPT_MAP: Record<AnalysisType, string> = {
  deidentification: DEIDENTIFICATION_PROMPT,
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
    const method = (body.method as string) || "ai"; // "ai" | "regex"

    if (!analysisType || !VALID_TYPES.includes(analysisType)) {
      return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 });
    }

    // Verify access — company admin or super admin only
    const access = await verifyReportAccess(request, id);
    if (!access.authorized || access.role === "reporter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch report data (without deidentified_data to avoid failure if column doesn't exist yet)
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

    // Separately fetch deidentified_data (may not exist if migration not applied)
    let deidentifiedData: DeidentifiedData | null = null;
    if (analysisType !== "deidentification") {
      const { data: deidRow } = await supabase
        .from("reports")
        .select("deidentified_data")
        .eq("id", access.reportId)
        .single();
      deidentifiedData = (deidRow?.deidentified_data as DeidentifiedData) || null;
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

    // Regex-based deidentification (no AI needed)
    if (analysisType === "deidentification" && method === "regex") {
      const result = regexDeidentify({
        title: title || "",
        content: content || "",
        fields: {
          who_field: report.who_field || "정보 없음",
          what_field: report.what_field || "정보 없음",
          when_field: report.when_field || "정보 없음",
          where_field: report.where_field || "정보 없음",
          why_field: report.why_field || "정보 없음",
          how_field: report.how_field || "정보 없음",
        },
      });
      return NextResponse.json({ result });
    }

    // Determine prompt input: use de-identified content for non-deidentification types if available
    let promptTitle = title || "";
    let promptContent = content || "";
    let promptFields = {
      who_field: report.who_field || "정보 없음",
      what_field: report.what_field || "정보 없음",
      when_field: report.when_field || "정보 없음",
      where_field: report.where_field || "정보 없음",
      why_field: report.why_field || "정보 없음",
      how_field: report.how_field || "정보 없음",
    };

    if (analysisType !== "deidentification" && deidentifiedData) {
      const deid = deidentifiedData;
      promptTitle = deid.deidentifiedTitle || promptTitle;
      promptContent = deid.deidentifiedContent || promptContent;
      if (deid.deidentifiedFields) {
        promptFields = {
          who_field: deid.deidentifiedFields.who_field || "정보 없음",
          what_field: deid.deidentifiedFields.what_field || "정보 없음",
          when_field: deid.deidentifiedFields.when_field || "정보 없음",
          where_field: deid.deidentifiedFields.where_field || "정보 없음",
          why_field: deid.deidentifiedFields.why_field || "정보 없음",
          how_field: deid.deidentifiedFields.how_field || "정보 없음",
        };
      }
    }

    // Get AI client for this company
    const ai = await getCompanyAIClient(report.company_id);

    // Check for custom prompt
    let promptTemplate = PROMPT_MAP[analysisType];
    const { data: customPrompt } = await supabase
      .from("company_ai_prompts")
      .select("prompt_template")
      .eq("company_id", report.company_id)
      .eq("prompt_type", analysisType)
      .single();

    if (customPrompt?.prompt_template) {
      promptTemplate = customPrompt.prompt_template;
    }

    // Build prompt with placeholders replaced
    let prompt = promptTemplate
      .replace("{report_number}", report.report_number || "")
      .replace("{title}", promptTitle)
      .replace("{content}", promptContent)
      .replace("{who_field}", promptFields.who_field)
      .replace("{what_field}", promptFields.what_field)
      .replace("{when_field}", promptFields.when_field)
      .replace("{where_field}", promptFields.where_field)
      .replace("{why_field}", promptFields.why_field)
      .replace("{how_field}", promptFields.how_field);

    // 회사 문서 참조가 필요한 분석 유형이면, 업로드된 문서 내용을 프롬프트에 추가
    if (DOCUMENT_AWARE_TYPES.includes(analysisType)) {
      const { data: documents } = await supabase
        .from("company_documents")
        .select("file_name, content_text")
        .eq("company_id", report.company_id)
        .limit(10);

      if (documents && documents.length > 0) {
        const docTexts = documents
          .filter((d) => d.content_text)
          .map((d) => {
            const text = (d.content_text || "").slice(0, MAX_DOC_LENGTH);
            return `[${d.file_name}]\n${text}`;
          })
          .join("\n\n---\n\n");

        if (docTexts) {
          prompt += `\n\n───── 회사 내부 규정/정책 문서 (우선 참고) ─────\n아래는 이 회사의 내부 규정, 정책, 가이드 문서입니다. 분석 시 이 문서들을 우선적으로 참고하여 회사 내규 위반 여부도 함께 판단해주세요. 문서에서 관련 내용을 찾을 수 없는 경우에는 일반적인 법률/규정 지식을 기반으로 분석해주세요.\n\n${docTexts}`;
        }
      }
    }

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
