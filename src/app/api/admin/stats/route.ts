import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [companiesRes, usersRes, reportsRes, applicationsRes, subscriptionsRes] =
    await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  // Monthly reports trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: recentReports } = await supabase
    .from("reports")
    .select("created_at")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  const monthlyTrend: Record<string, number> = {};
  recentReports?.forEach((r) => {
    const month = r.created_at.substring(0, 7);
    monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
  });

  return NextResponse.json({
    totalCompanies: companiesRes.count || 0,
    totalUsers: usersRes.count || 0,
    totalReports: reportsRes.count || 0,
    pendingApplications: applicationsRes.count || 0,
    activeSubscriptions: subscriptionsRes.count || 0,
    monthlyTrend,
  });
}
