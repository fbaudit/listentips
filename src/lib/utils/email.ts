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

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const settings = await getEmailSettings();
  if (!settings || !settings.enabled) return false;
  if (!settings.host || !settings.user) return false;

  try {
    // Use MailChannels API (Cloudflare Workers compatible) or basic SMTP via fetch
    // For Cloudflare Workers environment, we use a fetch-based approach
    const auth = btoa(`${settings.user}:${settings.password}`);
    const fromAddress = settings.from_email || settings.user;

    // Build MIME message for MailChannels or similar HTTP-based email API
    // If using standard SMTP, a proxy endpoint would be needed
    // For now, implement using MailChannels Send API (free for Cloudflare Workers)
    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromAddress, name: settings.from_name },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!response.ok) {
      // Fallback: try direct SMTP relay via custom endpoint
      // This is a placeholder - in production, configure an email service
      console.error("Email send failed:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}
