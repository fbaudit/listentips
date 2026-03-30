import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

/**
 * GET /api/company/compliance
 * 감사 대비 컴플라이언스 대시보드 데이터
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;
  const now = new Date();

  // 1. 전체 제보 수
  const { count: total } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  // 2. SLA 7일 접수확인 준수율
  const { data: allReports } = await supabase
    .from("reports")
    .select("created_at, acknowledged_at")
    .eq("company_id", companyId);

  let sla7Compliant = 0;
  let sla7Total = 0;
  for (const r of allReports || []) {
    const created = new Date(r.created_at);
    const sevenDaysLater = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (now > sevenDaysLater) {
      sla7Total++;
      if (r.acknowledged_at && new Date(r.acknowledged_at) <= sevenDaysLater) {
        sla7Compliant++;
      }
    }
  }

  // 3. SLA 3개월 피드백 준수율
  const { data: olderReports } = await supabase
    .from("reports")
    .select("created_at, feedback_at")
    .eq("company_id", companyId)
    .lt("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());

  let sla90Compliant = 0;
  const sla90Total = olderReports?.length || 0;
  for (const r of olderReports || []) {
    const created = new Date(r.created_at);
    const ninetyDaysLater = new Date(created.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (r.feedback_at && new Date(r.feedback_at) <= ninetyDaysLater) {
      sla90Compliant++;
    }
  }

  // 4. 미처리 제보 (배정 안 됨)
  const { count: unassigned } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("assigned_to", null)
    .is("resolved_at", null);

  // 5. 처리 완료
  const { count: resolved } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("resolved_at", "is", null);

  // 6. 평균 처리 일수
  const { data: resolvedList } = await supabase
    .from("reports")
    .select("created_at, resolved_at")
    .eq("company_id", companyId)
    .not("resolved_at", "is", null);

  let avgDays = 0;
  if (resolvedList && resolvedList.length > 0) {
    const totalDays = resolvedList.reduce((sum, r) => {
      return sum + (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDays = Math.round((totalDays / resolvedList.length) * 10) / 10;
  }

  // 7. 긴급 제보 수 (critical/high)
  const { count: urgent } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("ai_urgency", ["critical", "high"]);

  // 8. 감사 로그 수 (최근 30일)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: auditCount } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", thirtyDaysAgo);

  return NextResponse.json({
    compliance: {
      totalReports: total || 0,
      resolvedReports: resolved || 0,
      unassignedReports: unassigned || 0,
      urgentReports: urgent || 0,
      avgResolutionDays: avgDays,
      sla7Day: {
        total: sla7Total,
        compliant: sla7Compliant,
        rate: sla7Total > 0 ? Math.round((sla7Compliant / sla7Total) * 100) : 100,
      },
      sla90Day: {
        total: sla90Total,
        compliant: sla90Compliant,
        rate: sla90Total > 0 ? Math.round((sla90Compliant / sla90Total) * 100) : 100,
      },
      auditLogsLast30Days: auditCount || 0,
    },
  });
}
