import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const allowed = ["name", "url", "provider", "events", "is_active"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("company_webhooks")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", session.user.companyId);

  if (error) {
    return NextResponse.json({ error: "업데이트에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  await supabase
    .from("company_webhooks")
    .delete()
    .eq("id", id)
    .eq("company_id", session.user.companyId);

  return NextResponse.json({ message: "Deleted" });
}
