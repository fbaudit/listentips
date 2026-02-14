import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data: statuses, error } = await supabase
    .from("default_report_statuses")
    .select("id, status_name, color_code, display_order, is_default, is_terminal")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }

  return NextResponse.json({ statuses: statuses || [] });
}
