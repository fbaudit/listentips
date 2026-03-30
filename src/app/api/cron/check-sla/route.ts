import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addTimelineEvent } from "@/lib/utils/timeline";
import { sendWebhook } from "@/lib/utils/webhook";

/**
 * Cron: SLA 체크 (매일 실행)
 * - 접수 후 7일 이내 acknowledged_at 미설정 → 경고
 * - 접수 후 3개월 이내 feedback_at 미설정 → 경고
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  let warned = 0;

  // 1. 7-day acknowledgment SLA
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: unacknowledged } = await supabase
    .from("reports")
    .select("id, company_id, report_number")
    .eq("sla_acknowledged", false)
    .lt("created_at", sevenDaysAgo)
    .is("acknowledged_at", null);

  for (const report of unacknowledged || []) {
    await addTimelineEvent({
      reportId: report.id,
      eventType: "sla_warning",
      label: "접수 확인 기한(7일)이 초과되었습니다",
      metadata: { sla_type: "acknowledgment", days_overdue: 7 },
    });

    await sendWebhook(report.company_id, "sla_warning", {
      report_number: report.report_number,
      sla_type: "7일 접수 확인",
    });

    // Mark as warned to avoid repeated warnings
    await supabase.from("reports").update({ sla_acknowledged: true }).eq("id", report.id);
    warned++;
  }

  // 2. 3-month feedback SLA
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: noFeedback } = await supabase
    .from("reports")
    .select("id, company_id, report_number")
    .eq("sla_feedback", false)
    .lt("created_at", threeMonthsAgo)
    .is("feedback_at", null);

  for (const report of noFeedback || []) {
    await addTimelineEvent({
      reportId: report.id,
      eventType: "sla_warning",
      label: "피드백 기한(3개월)이 초과되었습니다",
      metadata: { sla_type: "feedback", days_overdue: 90 },
    });

    await sendWebhook(report.company_id, "sla_warning", {
      report_number: report.report_number,
      sla_type: "3개월 피드백",
    });

    await supabase.from("reports").update({ sla_feedback: true }).eq("id", report.id);
    warned++;
  }

  return NextResponse.json({ message: `SLA check complete. ${warned} warnings issued.`, warned });
}
