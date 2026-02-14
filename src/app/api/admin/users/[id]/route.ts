import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { hashPassword } from "@/lib/utils/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const allowedFields = [
    "name", "email", "username", "phone", "mobile", "country",
    "role", "company_id", "is_active", "valid_from", "valid_to",
  ];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Handle password change separately
  if (body.password) {
    updateData.password_hash = await hashPassword(body.password);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  // Check duplicate email/username if changed
  if (updateData.email || updateData.username) {
    const orConditions: string[] = [];
    if (updateData.email) orConditions.push(`email.eq.${updateData.email}`);
    if (updateData.username) orConditions.push(`username.eq.${updateData.username}`);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(orConditions.join(","))
      .neq("id", id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일 또는 아이디입니다" },
        { status: 409 }
      );
    }
  }

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Prevent self-deletion
  if (session.user.id === id) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("User delete error:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted" });
}
