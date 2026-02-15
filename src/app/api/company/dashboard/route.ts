import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const supabase = createAdminClient();

  // Fetch all reports with related data
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, created_at, updated_at, view_count, ai_validation_score, reporter_locale, report_type_id, status_id, report_types(type_name), report_statuses(status_name, color_code, is_default, is_terminal)"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const allReports = reports || [];
  const now = new Date();

  // --- 1. Status distribution ---
  const statusMap = new Map<string, { name: string; color: string; count: number }>();
  let pendingCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;

  for (const r of allReports) {
    const stRaw = r.report_statuses as unknown;
    const st = (Array.isArray(stRaw) ? stRaw[0] : stRaw) as { status_name: string; color_code: string; is_default: boolean; is_terminal: boolean } | null;
    if (!st) {
      pendingCount++;
      const key = "접수대기";
      const existing = statusMap.get(key);
      statusMap.set(key, { name: key, color: "#3b82f6", count: (existing?.count || 0) + 1 });
    } else {
      if (st.is_terminal) resolvedCount++;
      else if (st.is_default) pendingCount++;
      else inProgressCount++;
      const existing = statusMap.get(st.status_name);
      statusMap.set(st.status_name, { name: st.status_name, color: st.color_code, count: (existing?.count || 0) + 1 });
    }
  }

  const statusDistribution = Array.from(statusMap.values()).sort((a, b) => b.count - a.count);

  // --- 2. Report type distribution ---
  const typeMap = new Map<string, number>();
  for (const r of allReports) {
    const rtRaw = r.report_types as unknown;
    const rt = (Array.isArray(rtRaw) ? rtRaw[0] : rtRaw) as { type_name: string } | null;
    const name = rt?.type_name || "미분류";
    typeMap.set(name, (typeMap.get(name) || 0) + 1);
  }
  const typeDistribution = Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // --- 3. Monthly trend (last 12 months) ---
  const monthlyTrend: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTrend.push({ month: label, count: 0 });
  }
  for (const r of allReports) {
    const d = new Date(r.created_at);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyTrend.find((m) => m.month === label);
    if (entry) entry.count++;
  }

  // --- 4. Daily trend (last 30 days) ---
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyTrend.push({ date: label, count: 0 });
  }
  for (const r of allReports) {
    const d = new Date(r.created_at);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 30) {
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = dailyTrend.find((m) => m.date === label);
      if (entry) entry.count++;
    }
  }

  // --- 5. Day-of-week distribution ---
  const dayOfWeekNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeek = dayOfWeekNames.map((name) => ({ name, count: 0 }));
  for (const r of allReports) {
    const d = new Date(r.created_at);
    dayOfWeek[d.getDay()].count++;
  }

  // --- 6. AI validation score distribution ---
  const aiScoreBuckets = [
    { range: "0-20%", min: 0, max: 0.2, count: 0 },
    { range: "20-40%", min: 0.2, max: 0.4, count: 0 },
    { range: "40-60%", min: 0.4, max: 0.6, count: 0 },
    { range: "60-80%", min: 0.6, max: 0.8, count: 0 },
    { range: "80-100%", min: 0.8, max: 1.01, count: 0 },
  ];
  let aiScoredCount = 0;
  let aiScoreSum = 0;
  for (const r of allReports) {
    if (r.ai_validation_score != null) {
      aiScoredCount++;
      aiScoreSum += r.ai_validation_score;
      for (const bucket of aiScoreBuckets) {
        if (r.ai_validation_score >= bucket.min && r.ai_validation_score < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }
  }

  // --- 7. Reporter locale distribution ---
  const localeMap = new Map<string, number>();
  const localeLabels: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
  for (const r of allReports) {
    const loc = (r.reporter_locale as string) || "ko";
    localeMap.set(loc, (localeMap.get(loc) || 0) + 1);
  }
  const localeDistribution = Array.from(localeMap.entries())
    .map(([locale, count]) => ({ name: localeLabels[locale] || locale, count }))
    .sort((a, b) => b.count - a.count);

  // --- 8. Average processing time (created_at → updated_at for terminal reports) ---
  let totalProcessingHours = 0;
  let processedCount = 0;
  for (const r of allReports) {
    const stRaw2 = r.report_statuses as unknown;
    const st = (Array.isArray(stRaw2) ? stRaw2[0] : stRaw2) as { is_terminal: boolean } | null;
    if (st?.is_terminal && r.updated_at) {
      const created = new Date(r.created_at).getTime();
      const updated = new Date(r.updated_at).getTime();
      const hours = (updated - created) / (1000 * 60 * 60);
      if (hours > 0) {
        totalProcessingHours += hours;
        processedCount++;
      }
    }
  }
  const avgProcessingHours = processedCount > 0 ? Math.round(totalProcessingHours / processedCount) : null;

  // --- 9. Top viewed reports ---
  const topViewed = [...allReports]
    .filter((r) => r.view_count > 0)
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      viewCount: r.view_count,
    }));

  // --- 10. This month vs last month comparison ---
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let thisMonthCount = 0;
  let lastMonthCount = 0;
  for (const r of allReports) {
    const d = new Date(r.created_at);
    if (d >= thisMonthStart) thisMonthCount++;
    else if (d >= lastMonthStart && d < thisMonthStart) lastMonthCount++;
  }

  return NextResponse.json({
    summary: {
      total: allReports.length,
      pending: pendingCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      avgProcessingHours,
      aiAvgScore: aiScoredCount > 0 ? Math.round((aiScoreSum / aiScoredCount) * 100) : null,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
    },
    statusDistribution,
    typeDistribution,
    monthlyTrend,
    dailyTrend,
    dayOfWeek,
    aiScoreDistribution: aiScoreBuckets.map((b) => ({ range: b.range, count: b.count })),
    localeDistribution,
    topViewed,
  });
}
