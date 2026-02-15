import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isIpBlocked } from "@/lib/utils/security-check";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, name_en, logo_url, primary_color, channel_name, welcome_message, report_guide_message, use_ai_validation, use_chatbot, preferred_locale, content_blocks, service_end, block_foreign_ip, allowed_countries, ip_blocklist, min_password_length, require_special_chars, submission_success_title, submission_success_message")
    .eq("company_code", code)
    .eq("is_active", true)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Check if service_end has passed
  if (company.service_end && new Date(company.service_end) < new Date()) {
    return NextResponse.json({ error: "Service expired" }, { status: 404 });
  }

  // Security checks at page load
  if (company.block_foreign_ip) {
    const country = request.headers.get("x-vercel-ip-country") || "";
    if (country && !(company.allowed_countries || ["KR"]).includes(country)) {
      return NextResponse.json({ error: "Access restricted" }, { status: 403 });
    }
  }
  if (company.ip_blocklist?.length > 0) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    if (ip && isIpBlocked(ip, company.ip_blocklist)) {
      return NextResponse.json({ error: "Access restricted" }, { status: 403 });
    }
  }

  // Remove internal fields from response
  const { service_end: _, block_foreign_ip: _bf, allowed_countries: _ac, ip_blocklist: _ib, ...companyData } = company;

  const { data: reportTypes } = await supabase
    .from("report_types")
    .select("id, type_name, type_name_en, type_name_ja, type_name_zh, code, description")
    .eq("company_id", companyData.id)
    .eq("is_active", true)
    .order("display_order");

  const { data: statuses } = await supabase
    .from("report_statuses")
    .select("id, status_name, status_name_en, color_code, display_order")
    .eq("company_id", companyData.id)
    .order("display_order");

  return NextResponse.json({ company: companyData, reportTypes, statuses });
}
