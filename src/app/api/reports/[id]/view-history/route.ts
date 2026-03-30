import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";

/**
 * GET /api/reports/[id]/view-history
 * 제보자/관리자 모두 접근 가능 — 열람 횟수와 시각만 표시 (IP/이름 비공개)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 열람 이력 (제보자에게는 시각과 유형만)
  const { data: logs } = await supabase
    .from("reporter_access_logs")
    .select("id, accessed_at")
    .eq("report_id", id)
    .order("accessed_at", { ascending: false })
    .limit(50);

  // 관리자 열람 이력 (audit_logs에서)
  const { data: adminLogs } = await supabase
    .from("audit_logs")
    .select("created_at")
    .eq("entity_id", id)
    .eq("action", "report.view");

  return NextResponse.json({
    reporterViews: logs?.length || 0,
    adminViews: adminLogs?.length || 0,
    totalViews: (logs?.length || 0) + (adminLogs?.length || 0),
    recentAccess: (logs || []).slice(0, 10).map((l) => ({
      at: l.accessed_at,
      type: "reporter",
    })).concat(
      (adminLogs || []).slice(0, 10).map((l) => ({
        at: l.created_at,
        type: "admin",
      }))
    ).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10),
  });
}
