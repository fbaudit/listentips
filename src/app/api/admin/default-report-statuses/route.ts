import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: statuses, error } = await supabase
    .from("default_report_statuses")
    .select("id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal, is_active, created_at")
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load default report statuses" }, { status: 500 });
  }

  return NextResponse.json({ statuses: statuses || [] });
}

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  if (!body.status_name) {
    return NextResponse.json({ error: "상태명은 필수입니다" }, { status: 400 });
  }

  // Get max display_order
  const { data: maxOrder } = await supabase
    .from("default_report_statuses")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { data: status, error } = await supabase
    .from("default_report_statuses")
    .insert({
      status_name: body.status_name,
      status_name_en: body.status_name_en || null,
      status_name_ja: body.status_name_ja || null,
      status_name_zh: body.status_name_zh || null,
      color_code: body.color_code || "#6b7280",
      display_order: (maxOrder?.display_order || 0) + 1,
      is_default: body.is_default || false,
      is_terminal: body.is_terminal || false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ status }, { status: 201 });
}
