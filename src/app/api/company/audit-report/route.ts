import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

/**
 * GET /api/company/audit-report?from=2026-01-01&to=2026-03-31
 * 감사 추적 리포트 데이터 (PDF 생성은 클라이언트에서)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  // 기업 정보
  const { data: company } = await supabase
    .from("companies")
    .select("name, company_code")
    .eq("id", companyId)
    .single();

  // 기간 내 제보 통계
  let reportQuery = supabase
    .from("reports")
    .select("id, report_number, created_at, acknowledged_at, resolved_at, priority, ai_urgency, ai_category, status_id, report_statuses(status_name)")
    .eq("company_id", companyId);

  if (from) reportQuery = reportQuery.gte("created_at", from);
  if (to) reportQuery = reportQuery.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: reports } = await reportQuery.order("created_at", { ascending: false });

  // 감사 로그
  let logQuery = supabase
    .from("audit_logs")
    .select("action, entity_type, actor_name, created_at")
    .eq("company_id", companyId);

  if (from) logQuery = logQuery.gte("created_at", from);
  if (to) logQuery = logQuery.lte("created_at", `${to}T23:59:59.999Z`);

  const { data: auditLogs } = await logQuery.order("created_at", { ascending: false }).limit(500);

  // 통계 계산
  const totalReports = reports?.length || 0;
  const resolvedReports = reports?.filter((r) => r.resolved_at).length || 0;
  const avgDays = resolvedReports > 0
    ? Math.round(
        reports!
          .filter((r) => r.resolved_at)
          .reduce((sum, r) => sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 86400000, 0)
        / resolvedReports * 10
      ) / 10
    : 0;

  const ackWithin7 = reports?.filter((r) => {
    if (!r.acknowledged_at) return false;
    const diff = new Date(r.acknowledged_at).getTime() - new Date(r.created_at).getTime();
    return diff <= 7 * 86400000;
  }).length || 0;

  const urgentCount = reports?.filter((r) => r.ai_urgency === "critical" || r.ai_urgency === "high").length || 0;

  // 카테고리 분포
  const categoryDist: Record<string, number> = {};
  for (const r of reports || []) {
    const cat = r.ai_category || "미분류";
    categoryDist[cat] = (categoryDist[cat] || 0) + 1;
  }

  return NextResponse.json({
    company: { name: company?.name, code: company?.company_code },
    period: { from: from || "전체", to: to || "현재" },
    generatedAt: new Date().toISOString(),
    summary: {
      totalReports,
      resolvedReports,
      resolutionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0,
      avgResolutionDays: avgDays,
      sla7DayRate: totalReports > 0 ? Math.round((ackWithin7 / totalReports) * 100) : 100,
      urgentCount,
      categoryDistribution: categoryDist,
    },
    reports: (reports || []).map((r) => ({
      report_number: r.report_number,
      created_at: r.created_at,
      acknowledged_at: r.acknowledged_at,
      resolved_at: r.resolved_at,
      priority: r.priority,
      ai_urgency: r.ai_urgency,
      ai_category: r.ai_category,
      status: (r.report_statuses as unknown as { status_name: string } | null)?.status_name || "미설정",
    })),
    auditLogCount: auditLogs?.length || 0,
    auditLogs: (auditLogs || []).slice(0, 100),
  });
}
