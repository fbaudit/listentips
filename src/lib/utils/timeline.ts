import { createAdminClient } from "@/lib/supabase/admin";

export type TimelineEventType =
  | "submitted"
  | "acknowledged"
  | "under_review"
  | "investigating"
  | "assigned"
  | "resolved"
  | "closed"
  | "comment_added"
  | "escalated"
  | "status_changed"
  | "sla_warning";

const EVENT_LABELS: Record<TimelineEventType, string> = {
  submitted: "제보가 접수되었습니다",
  acknowledged: "접수가 확인되었습니다",
  under_review: "검토가 시작되었습니다",
  investigating: "조사가 진행 중입니다",
  assigned: "담당자가 배정되었습니다",
  resolved: "처리가 완료되었습니다",
  closed: "제보가 종결되었습니다",
  comment_added: "새 댓글이 등록되었습니다",
  escalated: "상위 담당자에게 에스컬레이션되었습니다",
  status_changed: "상태가 변경되었습니다",
  sla_warning: "처리 기한이 임박합니다",
};

interface AddTimelineParams {
  reportId: string;
  eventType: TimelineEventType;
  label?: string;
  actorType?: "system" | "admin" | "reporter";
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export async function addTimelineEvent({
  reportId,
  eventType,
  label,
  actorType = "system",
  actorId,
  metadata = {},
}: AddTimelineParams): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("report_timeline").insert({
    report_id: reportId,
    event_type: eventType,
    event_label: label || EVENT_LABELS[eventType] || eventType,
    actor_type: actorType,
    actor_id: actorId || null,
    metadata,
  });
}
