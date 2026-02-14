import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data: blocks, error } = await supabase
    .from("default_content_blocks")
    .select("id, content, display_order")
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }

  return NextResponse.json({ blocks: blocks || [] });
}
