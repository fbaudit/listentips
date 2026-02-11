import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, name_en, logo_url, primary_color, channel_name, welcome_message, report_guide_message, use_ai_validation, use_chatbot, preferred_locale, content_blocks")
    .eq("company_code", code)
    .eq("is_active", true)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { data: reportTypes } = await supabase
    .from("report_types")
    .select("id, type_name, type_name_en, type_name_ja, type_name_zh, description")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .order("display_order");

  const { data: statuses } = await supabase
    .from("report_statuses")
    .select("id, status_name, status_name_en, color_code, display_order")
    .eq("company_id", company.id)
    .order("display_order");

  return NextResponse.json({ company, reportTypes, statuses });
}
