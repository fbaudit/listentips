import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

/**
 * GET /api/company/reports/stats
 * 통계 데이터 (대시보드 + PDF용)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  // 전체 제보 수
  const { count: totalReports } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  // 상태별 분포
  const { data: statusDist } = await supabase
    .from("reports")
    .select("status_id, report_statuses(status_name)")
    .eq("company_id", companyId);

  const statusCounts: Record<string, number> = {};
  for (const r of statusDist || []) {
    const st = r.report_statuses as unknown as { status_name: string } | null;
    const name = st?.status_name || "미분류";
    statusCounts[name] = (statusCounts[name] || 0) + 1;
  }

  // 유형별 분포
  const { data: typeDist } = await supabase
    .from("reports")
    .select("report_type_id, report_types(type_name)")
    .eq("company_id", companyId);

  const typeCounts: Record<string, number> = {};
  for (const r of typeDist || []) {
    const rt = r.report_types as unknown as { type_name: string } | null;
    const name = rt?.type_name || "미분류";
    typeCounts[name] = (typeCounts[name] || 0) + 1;
  }

  // 월별 추이 (최근 12개월)
  const { data: monthlyRaw } = await supabase
    .from("reports")
    .select("created_at")
    .eq("company_id", companyId)
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  const monthlyCounts: Record<string, number> = {};
  for (const r of monthlyRaw || []) {
    const month = r.created_at.substring(0, 7); // YYYY-MM
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  }

  // AI 긴급도 분포
  const { data: urgencyRaw } = await supabase
    .from("reports")
    .select("ai_urgency")
    .eq("company_id", companyId)
    .not("ai_urgency", "is", null);

  const urgencyCounts: Record<string, number> = {};
  for (const r of urgencyRaw || []) {
    urgencyCounts[r.ai_urgency] = (urgencyCounts[r.ai_urgency] || 0) + 1;
  }

  // 평균 처리 시간
  const { data: resolvedReports } = await supabase
    .from("reports")
    .select("created_at, resolved_at")
    .eq("company_id", companyId)
    .not("resolved_at", "is", null);

  let avgResolutionDays = 0;
  if (resolvedReports && resolvedReports.length > 0) {
    const totalDays = resolvedReports.reduce((sum, r) => {
      const days = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgResolutionDays = Math.round((totalDays / resolvedReports.length) * 10) / 10;
  }

  // SLA 준수율
  const slaAckOnTime = (statusDist || []).filter(() => true).length; // placeholder
  const { count: acknowledged } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("sla_acknowledged", true);

  return NextResponse.json({
    stats: {
      totalReports: totalReports || 0,
      statusDistribution: statusCounts,
      typeDistribution: typeCounts,
      monthlyTrend: monthlyCounts,
      urgencyDistribution: urgencyCounts,
      avgResolutionDays,
      slaAcknowledged: acknowledged || 0,
      resolvedCount: resolvedReports?.length || 0,
    },
  });
}
