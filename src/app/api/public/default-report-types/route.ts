import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data: reportTypes, error } = await supabase
    .from("default_report_types")
    .select("id, type_name, type_name_en, type_name_ja, type_name_zh")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }

  return NextResponse.json({ reportTypes: reportTypes || [] });
}
