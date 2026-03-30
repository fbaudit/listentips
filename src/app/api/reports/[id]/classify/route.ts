import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { getCompanyAIClient } from "@/lib/ai/client";
import { addTimelineEvent } from "@/lib/utils/timeline";

const CLASSIFY_PROMPT = `당신은 기업 내부 익명 제보를 분류하는 전문가입니다.
아래 제보 내용을 분석하여 JSON 형태로 응답해주세요.

응답 형식 (JSON만 출력):
{
  "category": "분류 카테고리 (예: 부정행위, 횡령, 성희롱, 안전위반, 이해충돌, 정보유출, 근무태만, 기타)",
  "urgency": "긴급도 (low/medium/high/critical)",
  "urgency_reason": "긴급도 판단 이유 (1줄)",
  "summary": "제보 내용 요약 (2줄 이내)",
  "recommended_action": "권장 조치사항 (1줄)",
  "keywords": ["핵심 키워드 3~5개"]
}

긴급도 기준:
- critical: 신체적 위험, 즉각적인 법적 문제, 대규모 금전 손실
- high: 심각한 규정 위반, 반복적 피해, 다수 관련자
- medium: 일반적인 규정 위반, 단일 사건
- low: 경미한 사안, 의견/건의 성격`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await verifyReportAccess(request, id);
  if (!access.authorized || access.role === "reporter") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: report } = await supabase
    .from("reports")
    .select("title, content, company_id")
    .eq("id", id)
    .single();

  if (!report) {
    return NextResponse.json({ error: "제보를 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    const aiClient = await getCompanyAIClient(report.company_id);
    const prompt = `${CLASSIFY_PROMPT}\n\n제목: ${report.title}\n내용: ${report.content}`;
    const response = await aiClient.generateContent(prompt);

    let classification;
    try {
      const jsonStr = response.text.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
      classification = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "AI 응답 파싱에 실패했습니다" }, { status: 500 });
    }

    // Save classification
    await supabase.from("reports").update({
      ai_category: classification.category,
      ai_urgency: classification.urgency,
      ai_classification: classification,
    }).eq("id", id);

    // Add timeline event
    await addTimelineEvent({
      reportId: id,
      eventType: "status_changed",
      label: `AI 분류: ${classification.category} (긴급도: ${classification.urgency})`,
      actorType: "system",
      metadata: { classification },
    });

    return NextResponse.json({ classification });
  } catch (err) {
    console.error("AI classify error:", err);
    return NextResponse.json({ error: "AI 분류에 실패했습니다" }, { status: 500 });
  }
}
