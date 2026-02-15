import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/utils/password";

const VALID_COMPANY_ROLES = ["manager", "user", "other"];

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

  // Check requester's company_role — only managers can modify staff
  const { data: requester } = await supabase
    .from("users")
    .select("company_role")
    .eq("id", session.user.id)
    .single();

  if (requester?.company_role !== "manager") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // Prevent self-demotion and self-disable
  if (id === session.user.id) {
    if (body.company_role && body.company_role !== "manager") {
      return NextResponse.json({ error: "자기 자신의 역할은 변경할 수 없습니다" }, { status: 400 });
    }
    if (body.is_active === false) {
      return NextResponse.json({ error: "자기 자신은 비활성화할 수 없습니다" }, { status: 400 });
    }
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

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.mobile !== undefined) updateData.mobile = body.mobile;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.company_role !== undefined && VALID_COMPANY_ROLES.includes(body.company_role)) {
    updateData.company_role = body.company_role;
  }
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

  // Only managers can delete staff
  const { data: requester } = await supabase
    .from("users")
    .select("company_role")
    .eq("id", session.user.id)
    .single();

  if (requester?.company_role !== "manager") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

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
