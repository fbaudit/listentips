import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const companyId = searchParams.get("companyId") || "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("reports")
    .select(
      "id, report_number, title, created_at, company_id, companies(name, company_code), report_types(type_name), report_statuses(status_name, color_code)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (search) {
    query = query.or(
      `report_number.ilike.%${search}%,title.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Admin reports fetch error:", error);
    return NextResponse.json(
      { error: "제보 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  const reports = (data || []).map(
    (r: Record<string, unknown>) => {
      const companies = r.companies as { name: string; company_code: string } | null;
      const reportTypes = r.report_types as { type_name: string } | null;
      const reportStatuses = r.report_statuses as { status_name: string; color_code: string } | null;

      return {
        id: r.id,
        report_number: r.report_number,
        title: r.title,
        created_at: r.created_at,
        company_id: r.company_id,
        company: companies
          ? { name: companies.name, code: companies.company_code }
          : null,
        report_type: reportTypes ? { name: reportTypes.type_name } : null,
        status: reportStatuses
          ? { name: reportStatuses.status_name, color: reportStatuses.color_code }
          : null,
      };
    }
  );

  // Client-side status filter (status is in joined table)
  const filteredReports = status
    ? reports.filter((r) => r.status?.name === status)
    : reports;

  return NextResponse.json({
    reports: filteredReports,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
