import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: statuses, error } = await supabase
    .from("report_statuses")
    .select("id, status_name, status_name_en, color_code, display_order, is_default, is_terminal")
    .eq("company_id", session.user.companyId)
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load statuses" }, { status: 500 });
  }

  return NextResponse.json({ statuses: statuses || [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  if (!body.status_name) {
    return NextResponse.json({ error: "상태명은 필수입니다" }, { status: 400 });
  }

  const { data: maxOrder } = await supabase
    .from("report_statuses")
    .select("display_order")
    .eq("company_id", session.user.companyId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { data: status, error } = await supabase
    .from("report_statuses")
    .insert({
      company_id: session.user.companyId,
      status_name: body.status_name,
      status_name_en: body.status_name_en || null,
      color_code: body.color_code || "#6b7280",
      display_order: (maxOrder?.display_order || 0) + 1,
      is_default: body.is_default || false,
      is_terminal: body.is_terminal || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create status" }, { status: 500 });
  }

  return NextResponse.json({ status }, { status: 201 });
}
