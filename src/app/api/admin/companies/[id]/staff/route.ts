import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/utils/password";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: staff, error } = await supabase
    .from("users")
    .select("id, email, username, name, phone, mobile, role, is_active, created_at")
    .eq("company_id", id)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }

  return NextResponse.json({ staff: staff || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  if (!body.name || !body.email || !body.username || !body.password) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .or(`email.eq.${body.email},username.eq.${body.username}`)
    .single();

  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일 또는 아이디입니다" }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      company_id: id,
      email: body.email,
      username: body.username,
      password_hash: passwordHash,
      name: body.name,
      phone: body.phone || null,
      mobile: body.mobile || null,
      role: "company_admin",
      is_active: true,
    })
    .select("id, email, username, name, phone, mobile, role, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }

  const eventTypes = ["new_report", "report_modified", "report_deleted", "new_comment", "comment_modified", "comment_deleted"];
  await supabase.from("user_notification_preferences").insert(
    eventTypes.map((eventType) => ({
      user_id: user.id,
      event_type: eventType,
      email_enabled: true,
      sms_enabled: false,
    }))
  );

  return NextResponse.json({ staff: user }, { status: 201 });
}
