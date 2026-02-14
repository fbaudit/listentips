import { createAdminClient } from "@/lib/supabase/admin";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailSettings {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
  enabled: boolean;
}

async function getEmailSettings(): Promise<EmailSettings | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "email_settings")
    .single();

  if (!data?.value) return null;
  return data.value as EmailSettings;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const settings = await getEmailSettings();
  if (!settings || !settings.enabled) {
    const msg = "이메일 발송이 비활성화되어 있습니다 (enabled: false)";
    console.error(msg);
    return { success: false, error: msg };
  }
  if (!settings.host || !settings.user) {
    const msg = `이메일 설정 누락 - host: "${settings.host}", user: "${settings.user}"`;
    console.error(msg);
    return { success: false, error: msg };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.password,
      },
    });

    const fromAddress = settings.from_email || settings.user;

    await transporter.sendMail({
      from: `"${settings.from_name}" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Email send error:", errMsg);
    return { success: false, error: errMsg };
  }
}
