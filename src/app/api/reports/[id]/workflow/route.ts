import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { addTimelineEvent, type TimelineEventType } from "@/lib/utils/timeline";
import { sendWebhook } from "@/lib/utils/webhook";
import { createAuditLog } from "@/lib/utils/audit-log";

/**
 * POST /api/reports/[id]/workflow
 * Actions: assign, acknowledge, start_investigation, resolve, close, escalate, set_priority
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await verifyReportAccess(request, id);
  if (!access.authorized || access.role === "reporter") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (!action) {
    return NextResponse.json({ error: "action이 필요합니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, report_number, company_id, assigned_to")
    .eq("id", id)
    .single();

  if (!report) {
    return NextResponse.json({ error: "제보를 찾을 수 없습니다" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {};
  let timelineEvent: TimelineEventType = "status_changed";
  let timelineLabel = "";
  let webhookEvent: Parameters<typeof sendWebhook>[1] = "status_change";

  switch (action) {
    case "assign": {
      const { assigneeId } = body;
      if (!assigneeId) return NextResponse.json({ error: "assigneeId가 필요합니다" }, { status: 400 });

      const { data: assignee } = await supabase.from("users").select("name").eq("id", assigneeId).single();
      updateData.assigned_to = assigneeId;
      updateData.assigned_at = now;
      timelineEvent = "assigned";
      timelineLabel = `담당자가 ${assignee?.name || "알 수 없음"}(으)로 배정되었습니다`;
      webhookEvent = "assigned";
      break;
    }

    case "acknowledge":
      updateData.acknowledged_at = now;
      updateData.sla_acknowledged = true;
      timelineEvent = "acknowledged";
      timelineLabel = "접수가 확인되었습니다";
      break;

    case "start_investigation":
      updateData.investigation_started_at = now;
      timelineEvent = "investigating";
      timelineLabel = "조사가 시작되었습니다";
      break;

    case "resolve": {
      const { summary } = body;
      updateData.resolved_at = now;
      updateData.feedback_at = now;
      updateData.sla_feedback = true;
      updateData.resolution_summary = summary || "";
      timelineEvent = "resolved";
      timelineLabel = "처리가 완료되었습니다";
      break;
    }

    case "close":
      timelineEvent = "closed";
      timelineLabel = "제보가 종결되었습니다";
      break;

    case "escalate": {
      const { reason } = body;
      timelineEvent = "escalated";
      timelineLabel = `상위 담당자에게 에스컬레이션되었습니다${reason ? `: ${reason}` : ""}`;
      break;
    }

    case "set_priority": {
      const { priority } = body;
      if (!["low", "medium", "high", "critical"].includes(priority)) {
        return NextResponse.json({ error: "유효하지 않은 우선순위입니다" }, { status: 400 });
      }
      updateData.priority = priority;
      const priorityLabels: Record<string, string> = { low: "낮음", medium: "보통", high: "높음", critical: "긴급" };
      timelineLabel = `우선순위가 '${priorityLabels[priority]}'(으)로 변경되었습니다`;
      break;
    }

    default:
      return NextResponse.json({ error: "지원하지 않는 action입니다" }, { status: 400 });
  }

  // Apply DB update
  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase.from("reports").update(updateData).eq("id", id);
    if (error) {
      console.error("Workflow update error:", error);
      return NextResponse.json({ error: "업데이트에 실패했습니다" }, { status: 500 });
    }
  }

  // Timeline
  await addTimelineEvent({
    reportId: id,
    eventType: timelineEvent,
    label: timelineLabel,
    actorType: "admin",
    actorId: (access as { userId?: string }).userId,
    metadata: { action, ...body },
  });

  // Webhook
  sendWebhook(report.company_id, webhookEvent, {
    report_number: report.report_number,
    action,
  }).catch(() => {});

  // Audit log
  createAuditLog({
    request,
    companyId: report.company_id,
    actorId: (access as { userId?: string }).userId || "",
    actorName: "",
    action: `report.${action}` as import("@/types/database").AuditAction,
    entityType: "report",
    entityId: id,
    changes: { new: updateData },
  }).catch(() => {});

  return NextResponse.json({ message: "처리되었습니다", action });
}
