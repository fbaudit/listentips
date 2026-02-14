import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/utils/password";
import { generateReporterToken } from "@/lib/utils/reporter-token";
import { checkSecurity } from "@/lib/utils/security-check";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { reportNumber, password, companyCode } = await request.json();

    if (!reportNumber || !password || !companyCode) {
      return NextResponse.json({ error: "접수번호와 비밀번호를 입력해주세요" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up report AND validate it belongs to the specified company
    const { data: report, error } = await supabase
      .from("reports")
      .select("id, report_number, password_hash, company_id, companies(company_code)")
      .eq("report_number", reportNumber.toUpperCase())
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "일치하는 제보를 찾을 수 없습니다" }, { status: 404 });
    }

    // Validate the report belongs to the company
    const company = report.companies as unknown as { company_code: string } | null;
    if (!company || company.company_code !== companyCode.toUpperCase()) {
      return NextResponse.json({ error: "일치하는 제보를 찾을 수 없습니다" }, { status: 404 });
    }

    // Security checks (IP country, blocklist)
    const { data: companySettings } = await supabase
      .from("companies")
      .select("block_foreign_ip, allowed_countries, ip_blocklist")
      .eq("id", report.company_id)
      .single();

    if (companySettings) {
      const securityResult = await checkSecurity(request, report.company_id, {
        block_foreign_ip: companySettings.block_foreign_ip,
        allowed_countries: companySettings.allowed_countries || ["KR"],
        ip_blocklist: companySettings.ip_blocklist || [],
        rate_limit_enabled: false,
        rate_limit_max_reports: 0,
        rate_limit_window_minutes: 0,
      }, { skipRateLimit: true });
      if (!securityResult.allowed) {
        return NextResponse.json({ error: securityResult.reason }, { status: 403 });
      }
    }

    const isValid = await verifyPassword(password, report.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다" }, { status: 401 });
    }

    // Generate a verifiable token with reportId and companyId
    const token = generateReporterToken(report.id, report.company_id);

    // Record reporter access log
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
    await supabase.from("reporter_access_logs").insert({
      report_id: report.id,
      ip_hash: ipHash,
    });

    // Increment view count (best-effort)
    const { error: rpcError } = await supabase.rpc("increment_view_count", { report_id: report.id });
    if (rpcError) {
      await supabase
        .from("reports")
        .update({ view_count: 1 })
        .eq("id", report.id);
    }

    return NextResponse.json({
      token,
      reportId: report.id,
      message: "인증되었습니다",
    });
  } catch (error) {
    console.error("Report check error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
