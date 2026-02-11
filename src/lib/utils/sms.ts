import { createAdminClient } from "@/lib/supabase/admin";

interface SmsOptions {
  to: string;
  message: string;
}

interface SmsSettings {
  provider: string;
  api_key: string;
  sender_number: string;
  enabled: boolean;
}

async function getSmsSettings(): Promise<SmsSettings | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "sms_settings")
    .single();

  if (!data?.value) return null;
  return data.value as SmsSettings;
}

export async function sendSMS({ to, message }: SmsOptions): Promise<boolean> {
  const settings = await getSmsSettings();
  if (!settings || !settings.enabled) return false;
  if (!settings.provider || !settings.api_key) return false;

  try {
    switch (settings.provider) {
      case "aligo": {
        const formData = new URLSearchParams();
        formData.append("key", settings.api_key);
        formData.append("sender", settings.sender_number);
        formData.append("receiver", to);
        formData.append("msg", message);

        const response = await fetch("https://apis.aligo.in/send/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const result = await response.json();
        return result.result_code === "1";
      }

      case "naver_cloud": {
        const response = await fetch(
          "https://sens.apigw.ntruss.com/sms/v2/services/ncp:sms:kr/messages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-ncp-apigw-api-key": settings.api_key,
            },
            body: JSON.stringify({
              type: "SMS",
              from: settings.sender_number,
              content: message,
              messages: [{ to }],
            }),
          }
        );

        return response.ok;
      }

      case "gabia": {
        // api_key format: "SMS_ID:API_KEY"
        const [smsId, apiKey] = settings.api_key.split(":");
        if (!smsId || !apiKey) return false;

        // Step 1: OAuth 토큰 발급
        const tokenRes = await fetch("https://sms.gabia.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${smsId}:${apiKey}`)}`,
          },
          body: "grant_type=client_credentials",
        });

        if (!tokenRes.ok) return false;
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) return false;

        // Step 2: SMS 발송
        const smsForm = new URLSearchParams();
        smsForm.append("phone", to);
        smsForm.append("callback", settings.sender_number);
        smsForm.append("message", message);

        const smsRes = await fetch("https://sms.gabia.com/api/send/sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${smsId}:${accessToken}`)}`,
          },
          body: smsForm.toString(),
        });

        return smsRes.ok;
      }

      case "twilio": {
        // Twilio requires Account SID and Auth Token
        // api_key format: "ACCOUNT_SID:AUTH_TOKEN"
        const [accountSid, authToken] = settings.api_key.split(":");
        if (!accountSid || !authToken) return false;

        const formData = new URLSearchParams();
        formData.append("From", settings.sender_number);
        formData.append("To", to);
        formData.append("Body", message);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          }
        );

        return response.ok;
      }

      default:
        console.error("Unknown SMS provider:", settings.provider);
        return false;
    }
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}
