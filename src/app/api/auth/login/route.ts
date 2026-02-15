import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCaptcha } from "@/lib/utils/captcha";
import { verifyPassword } from "@/lib/utils/password";
import { sendVerificationCodeToUser, maskEmail, maskPhone } from "@/lib/utils/verification-code";
import crypto from "crypto";

interface LoginSecuritySettings {
  max_attempts: number;
  lockout_minutes: number;
  captcha_enabled: boolean;
  two_factor_enabled: boolean;
}

function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password, captchaToken, channel } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 입력해주세요" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Load security settings
  const { data: settingsRow } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "login_security")
    .single();

  const settings: LoginSecuritySettings = {
    max_attempts: 5,
    lockout_minutes: 15,
    captcha_enabled: true,
    two_factor_enabled: true,
    ...settingsRow?.value,
  };

  // 2. Verify CAPTCHA if enabled (fail-closed: block if key is missing)
  if (settings.captcha_enabled) {
    const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecretKey) {
      console.error("CAPTCHA is enabled but TURNSTILE_SECRET_KEY is not configured");
      return NextResponse.json(
        { error: "서버 보안 설정 오류입니다. 관리자에게 문의하세요." },
        { status: 500 }
      );
    }
    if (!captchaToken) {
      return NextResponse.json(
        { error: "CAPTCHA 인증이 필요합니다" },
        { status: 403 }
      );
    }
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { error: "CAPTCHA 인증에 실패했습니다. 다시 시도해주세요." },
        { status: 403 }
      );
    }
  }

  // 3. Check rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = hashIP(ip);
  const lockoutTime = new Date(
    Date.now() - settings.lockout_minutes * 60 * 1000
  ).toISOString();

  // Find last successful login to only count failures after it
  const { data: lastSuccess } = await supabase
    .from("login_attempts")
    .select("attempted_at")
    .eq("username", username)
    .eq("success", true)
    .order("attempted_at", { ascending: false })
    .limit(1)
    .single();

  // Count failures since the later of: lockout window start OR last successful login
  const countSince = lastSuccess && lastSuccess.attempted_at > lockoutTime
    ? lastSuccess.attempted_at
    : lockoutTime;

  const { count: failedAttempts } = await supabase
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("username", username)
    .eq("success", false)
    .gt("attempted_at", countSince);

  if (failedAttempts !== null && failedAttempts >= settings.max_attempts) {
    // Find the most recent failed attempt to calculate remaining time
    const { data: lastAttempt } = await supabase
      .from("login_attempts")
      .select("attempted_at")
      .eq("username", username)
      .eq("success", false)
      .order("attempted_at", { ascending: false })
      .limit(1)
      .single();

    let remainingMinutes = settings.lockout_minutes;
    if (lastAttempt) {
      const lastAttemptTime = new Date(lastAttempt.attempted_at).getTime();
      const unlockTime = lastAttemptTime + settings.lockout_minutes * 60 * 1000;
      remainingMinutes = Math.ceil((unlockTime - Date.now()) / 60000);
      if (remainingMinutes < 1) remainingMinutes = 1;
    }

    return NextResponse.json(
      {
        error: `로그인 시도 횟수를 초과했습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`,
        locked: true,
        remainingMinutes,
      },
      { status: 429 }
    );
  }

  // 4. Verify credentials
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, password_hash, role, company_id, is_active, valid_from, valid_to, email, mobile")
    .eq("username", username)
    .single();

  if (error || !user || !user.is_active) {
    // Record failed attempt
    await supabase.from("login_attempts").insert({
      username,
      ip_hash: ipHash,
      success: false,
    });

    const newFailedCount = (failedAttempts || 0) + 1;
    const remaining = settings.max_attempts - newFailedCount;

    return NextResponse.json(
      {
        error: remaining > 0
          ? `아이디 또는 비밀번호가 일치하지 않습니다 (${remaining}회 남음)`
          : `로그인 시도 횟수를 초과했습니다. ${settings.lockout_minutes}분 후에 다시 시도해주세요.`,
        locked: remaining <= 0,
      },
      { status: 401 }
    );
  }

  // Check validity period
  if (user.valid_from && new Date(user.valid_from) > new Date()) {
    await supabase.from("login_attempts").insert({
      username,
      ip_hash: ipHash,
      success: false,
    });
    return NextResponse.json(
      { error: "계정이 아직 활성화되지 않았습니다" },
      { status: 401 }
    );
  }
  if (user.valid_to && new Date(user.valid_to) < new Date()) {
    await supabase.from("login_attempts").insert({
      username,
      ip_hash: ipHash,
      success: false,
    });
    return NextResponse.json(
      { error: "계정이 만료되었습니다" },
      { status: 401 }
    );
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    await supabase.from("login_attempts").insert({
      username,
      ip_hash: ipHash,
      success: false,
    });

    const newFailedCount = (failedAttempts || 0) + 1;
    const remaining = settings.max_attempts - newFailedCount;

    return NextResponse.json(
      {
        error: remaining > 0
          ? `아이디 또는 비밀번호가 일치하지 않습니다 (${remaining}회 남음)`
          : `로그인 시도 횟수를 초과했습니다. ${settings.lockout_minutes}분 후에 다시 시도해주세요.`,
        locked: remaining <= 0,
      },
      { status: 401 }
    );
  }

  // 5. Credentials valid — check if 2FA is enabled
  // Platform-level 2FA must be enabled first
  let twoFactorActive = settings.two_factor_enabled;

  // If platform 2FA is enabled, also check company-level 2FA setting
  if (twoFactorActive && user.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("two_factor_enabled")
      .eq("id", user.company_id)
      .single();

    if (company && !company.two_factor_enabled) {
      twoFactorActive = false;
    }
  }

  if (!twoFactorActive) {
    // 2FA disabled: record success and allow direct login
    await supabase.from("login_attempts").insert({
      username,
      ip_hash: ipHash,
      success: true,
    });
    return NextResponse.json({ directLogin: true });
  }

  // 6. Send 2FA verification code
  const sendChannel = channel === "sms" ? "sms" : "email";
  const { success: codeSent, sentVia, error: sendError } = await sendVerificationCodeToUser(
    user.id,
    user.email,
    user.mobile,
    sendChannel
  );

  if (!codeSent) {
    console.error("2FA code send failed:", sendError);
    return NextResponse.json(
      { error: `인증번호 발송에 실패했습니다: ${sendError || "이메일/SMS 설정을 확인해주세요."}` },
      { status: 500 }
    );
  }

  // Build masked contact info for display
  const maskedEmail = maskEmail(user.email);
  const maskedMobile = user.mobile ? maskPhone(user.mobile) : null;

  return NextResponse.json({
    requiresVerification: true,
    userId: user.id,
    sentVia,
    maskedEmail,
    maskedMobile,
  });
}
