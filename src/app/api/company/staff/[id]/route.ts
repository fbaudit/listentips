import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/utils/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("company_id", session.user.companyId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.mobile !== undefined) updateData.mobile = body.mobile;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.password) {
    updateData.password_hash = await hashPassword(body.password);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Cannot delete self
  if (id === session.user.id) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다" }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .eq("company_id", session.user.companyId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted" });
}
