import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/utils/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, staffId } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", staffId)
    .eq("company_id", id)
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
    .eq("id", staffId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, staffId } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", staffId)
    .eq("company_id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", staffId);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted" });
}
