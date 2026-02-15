import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyAuth } from "./company-auth";
import { adminAuth } from "./admin-auth";
import { verifyReporterToken } from "@/lib/utils/reporter-token";

export type ReportAccessResult =
  | { authorized: true; role: "reporter" | "company_admin" | "super_admin"; reportId: string; companyId: string }
  | { authorized: false };

/**
 * Verify that the request has valid access to a specific report.
 * Supports three access patterns:
 * 1. Reporter: Bearer token with matching reportId
 * 2. Company admin: session with matching companyId
 * 3. Super admin: session with super_admin role (unrestricted)
 *
 * @param request - The incoming request
 * @param reportIdentifier - Report ID (UUID) or report_number
 * @param reporterToken - Optional reporter token (fallback for FormData uploads)
 */
export async function verifyReportAccess(
  request: NextRequest,
  reportIdentifier: string,
  reporterToken?: string
): Promise<ReportAccessResult> {
  const supabase = createAdminClient();

  // Resolve report to get id and company_id
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportIdentifier);
  const column = isUUID ? "id" : "report_number";
  const { data: report } = await supabase
    .from("reports")
    .select("id, company_id")
    .eq(column, reportIdentifier)
    .single();

  if (!report) {
    return { authorized: false };
  }

  // 1. Check Bearer token (reporter access) - from header or explicit parameter
  const authHeader = request.headers.get("authorization");
  const tokenStr = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : reporterToken;
  if (tokenStr) {
    const tokenData = verifyReporterToken(tokenStr);

    if (tokenData && tokenData.reportId === report.id && tokenData.companyId === report.company_id) {
      return { authorized: true, role: "reporter", reportId: report.id, companyId: report.company_id };
    }
    // Invalid token - don't fall through, deny access
    return { authorized: false };
  }

  // 2. Check super admin session
  const adminSession = await adminAuth();
  if (adminSession?.user?.role === "super_admin") {
    return { authorized: true, role: "super_admin", reportId: report.id, companyId: report.company_id };
  }

  // 3. Check company admin session
  const companySession = await companyAuth();
  if (companySession?.user?.companyId === report.company_id) {
    return { authorized: true, role: "company_admin", reportId: report.id, companyId: report.company_id };
  }

  return { authorized: false };
}
