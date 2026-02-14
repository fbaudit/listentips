import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { hashPassword } from "@/lib/utils/password";

export async function GET(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select("id, email, username, name, phone, mobile, country, role, company_id, is_active, two_factor_enabled, valid_from, valid_to, last_login_at, created_at, updated_at, companies(name, company_code)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq("role", role);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json({ error: "사용자 조회 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({
    users: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, username, password, name, phone, mobile, country, role, companyId } = body;

  if (!email || !username || !password || !name || !role) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check duplicates
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .or(`email.eq.${email},username.eq.${username}`)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 이메일 또는 아이디입니다" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email,
      username,
      password_hash: passwordHash,
      name,
      phone: phone || null,
      mobile: mobile || null,
      country: country || "KR",
      role,
      company_id: companyId || null,
      is_active: true,
    })
    .select("id, email, username, name, role")
    .single();

  if (error) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "사용자 생성 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json(user, { status: 201 });
}
