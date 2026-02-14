import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: blocks, error } = await supabase
    .from("default_content_blocks")
    .select("id, content, display_order, is_active, created_at")
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load default content blocks" }, { status: 500 });
  }

  return NextResponse.json({ blocks: blocks || [] });
}

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  // Get max display_order
  const { data: maxOrder } = await supabase
    .from("default_content_blocks")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { data: block, error } = await supabase
    .from("default_content_blocks")
    .insert({
      content: body.content || "",
      display_order: (maxOrder?.display_order || 0) + 1,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ block }, { status: 201 });
}
