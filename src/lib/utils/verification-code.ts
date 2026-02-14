import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/utils/email";
import { sendSMS } from "@/lib/utils/sms";

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Mask email for display (e.g., "j***@gmail.com")
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 3))}@${domain}`;
}

/**
 * Mask phone for display (e.g., "010-****-5678")
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "****";
  return `${digits.substring(0, 3)}-****-${digits.substring(digits.length - 4)}`;
}

/**
 * Create a verification code, save to DB, and send via specified channel
 * @param channel - "email" (default), "sms", or "both"
 */
export async function sendVerificationCodeToUser(
  userId: string,
  email: string,
  mobile: string | null,
  channel: "email" | "sms" | "both" = "email"
): Promise<{ success: boolean; sentVia: string; error?: string }> {
  const supabase = createAdminClient();
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Invalidate any previous unused codes for this user
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("type", "login_2fa")
    .eq("used", false);

  // Determine sending channels
  const sentChannels: string[] = [];
  const errors: string[] = [];

  // Send email
  if (channel === "email" || channel === "both") {
    const emailResult = await sendEmail({
      to: email,
      subject: "[Listen] 로그인 인증번호",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">로그인 인증번호</h2>
          <p>아래 인증번호를 입력하여 로그인을 완료하세요.</p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
          </div>
          <p style="color: #71717a; font-size: 14px;">이 인증번호는 5분간 유효합니다.</p>
          <p style="color: #71717a; font-size: 14px;">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
        </div>
      `,
    });
    if (emailResult.success) {
      sentChannels.push("email");
    } else if (emailResult.error) {
      errors.push(`이메일: ${emailResult.error}`);
    }
  }

  // Send SMS
  if ((channel === "sms" || channel === "both") && mobile) {
    const smsSent = await sendSMS({
      to: mobile,
      message: `[Listen] 로그인 인증번호: ${code} (5분간 유효)`,
    });
    if (smsSent) sentChannels.push("sms");
    else errors.push("SMS: 발송 실패");
  } else if (channel === "sms" && !mobile) {
    errors.push("SMS: 등록된 전화번호가 없습니다");
  }

  const sentVia = sentChannels.join(",") || "none";

  // Save to DB
  const { error: insertError } = await supabase.from("verification_codes").insert({
    user_id: userId,
    code,
    type: "login_2fa",
    sent_via: sentVia,
    expires_at: expiresAt,
    used: false,
  });

  if (insertError) {
    console.error("Failed to save verification code to DB:", insertError.message);
    return {
      success: false,
      sentVia: "none",
      error: `인증번호 DB 저장 실패: ${insertError.message}`,
    };
  }

  return {
    success: sentChannels.length > 0,
    sentVia,
    error: sentChannels.length === 0 ? errors.join(" | ") : undefined,
  };
}

/**
 * Verify a 2FA code
 * @param markAsUsed - If true, marks the code as used (consumed). Default: true.
 *   Use false for pre-validation (e.g., /api/auth/verify-code),
 *   and true for final consumption (e.g., NextAuth authorize).
 */
export async function verifyCode(
  userId: string,
  code: string,
  markAsUsed: boolean = true
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("verification_codes")
    .select("id")
    .eq("user_id", userId)
    .eq("code", code)
    .eq("type", "login_2fa")
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;

  if (markAsUsed) {
    // Mark as used so it can't be reused
    await supabase
      .from("verification_codes")
      .update({ used: true })
      .eq("id", data.id);
  }

  return true;
}
