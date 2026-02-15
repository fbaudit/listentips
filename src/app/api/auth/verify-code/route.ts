import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/utils/verification-code";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, code } = body;

  if (!userId || !code) {
    return NextResponse.json(
      { error: "인증번호를 입력해주세요" },
      { status: 400 }
    );
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "인증번호는 6자리 숫자입니다" },
      { status: 400 }
    );
  }

  // Rate limit: check recent failed verification attempts for this user
  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - VERIFY_WINDOW_MS).toISOString();

  const { count: recentFailures } = await supabase
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("username", `2fa_${userId}`)
    .eq("success", false)
    .gt("attempted_at", windowStart);

  if (recentFailures !== null && recentFailures >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json(
      { error: "인증번호 입력 횟수를 초과했습니다. 5분 후에 다시 시도해주세요." },
      { status: 429 }
    );
  }

  // Only validate — don't mark as used yet.
  // The code will be consumed (marked used) by NextAuth's authorize().
  const valid = await verifyCode(userId, code, false);

  if (!valid) {
    // Record failed 2FA attempt
    await supabase.from("login_attempts").insert({
      username: `2fa_${userId}`,
      ip_hash: "2fa_verify",
      success: false,
    });

    return NextResponse.json(
      { error: "인증번호가 올바르지 않거나 만료되었습니다" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
