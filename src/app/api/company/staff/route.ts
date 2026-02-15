import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/utils/password";

const VALID_COMPANY_ROLES = ["manager", "user", "other"];

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: staff, error } = await supabase
    .from("users")
    .select("id, email, username, name, phone, mobile, role, company_role, is_active, created_at")
    .eq("company_id", session.user.companyId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }

  return NextResponse.json({ staff: staff || [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers can add staff
  const supabase = createAdminClient();
  const { data: requester } = await supabase
    .from("users")
    .select("company_role")
    .eq("id", session.user.id)
    .single();

  if (requester?.company_role !== "manager") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.name || !body.email || !body.username || !body.password) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
  }

  const companyRole = VALID_COMPANY_ROLES.includes(body.company_role) ? body.company_role : "manager";

  // Check duplicate email/username
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
      company_id: session.user.companyId,
      email: body.email,
      username: body.username,
      password_hash: passwordHash,
      name: body.name,
      phone: body.phone || null,
      mobile: body.mobile || null,
      role: "company_admin",
      company_role: companyRole,
      is_active: true,
    })
    .select("id, email, username, name, phone, mobile, role, company_role, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }

  // Create default notification preferences
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
