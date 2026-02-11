import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username } = body;

  if (!username || username.length < 4) {
    return NextResponse.json({ available: false, message: "아이디는 최소 4자리입니다" });
  }

  const supabase = createAdminClient();

  // Check in users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUser) {
    return NextResponse.json({ available: false, message: "이미 사용 중인 아이디입니다" });
  }

  // Check in pending applications
  const { data: existingApp } = await supabase
    .from("applications")
    .select("id")
    .eq("admin_username", username)
    .eq("status", "pending")
    .single();

  if (existingApp) {
    return NextResponse.json({ available: false, message: "이미 신청 중인 아이디입니다" });
  }

  return NextResponse.json({ available: true, message: "사용 가능한 아이디입니다" });
}
