import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: reportTypes, error } = await supabase
    .from("report_types")
    .select("id, type_name, type_name_en, type_name_ja, type_name_zh, code, description, notes, display_order, is_active")
    .eq("company_id", session.user.companyId)
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load report types" }, { status: 500 });
  }

  return NextResponse.json({ reportTypes: reportTypes || [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  if (!body.type_name) {
    return NextResponse.json({ error: "제보 유형명은 필수입니다" }, { status: 400 });
  }

  // Get max display_order
  const { data: maxOrder } = await supabase
    .from("report_types")
    .select("display_order")
    .eq("company_id", session.user.companyId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { data: reportType, error } = await supabase
    .from("report_types")
    .insert({
      company_id: session.user.companyId,
      type_name: body.type_name,
      type_name_en: body.type_name_en || null,
      type_name_ja: body.type_name_ja || null,
      type_name_zh: body.type_name_zh || null,
      code: body.code || null,
      description: body.description || null,
      notes: body.notes || null,
      display_order: (maxOrder?.display_order || 0) + 1,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create report type" }, { status: 500 });
  }

  return NextResponse.json({ reportType }, { status: 201 });
}
