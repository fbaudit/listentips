import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type WebhookEvent = "new_report" | "status_change" | "new_comment" | "assigned" | "sla_warning";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Send webhook to all active webhooks for a company that subscribe to this event.
 */
export async function sendWebhook(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: webhooks } = await supabase
      .from("company_webhooks")
      .select("id, url, provider, secret_key, events")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (!webhooks?.length) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const body = JSON.stringify(payload);

    for (const webhook of webhooks) {
      // Check if webhook subscribes to this event
      if (webhook.events && !webhook.events.includes(event)) continue;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add signature if secret key is configured
      if (webhook.secret_key) {
        const signature = crypto
          .createHmac("sha256", webhook.secret_key)
          .update(body)
          .digest("hex");
        headers["X-Webhook-Signature"] = signature;
      }

      // Format for Slack
      if (webhook.provider === "slack") {
        const slackBody = JSON.stringify({
          text: formatSlackMessage(event, data),
        });
        fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: slackBody,
        }).catch((err) => console.error(`Webhook ${webhook.id} failed:`, err));
        continue;
      }

      // Format for Microsoft Teams
      if (webhook.provider === "teams") {
        const teamsBody = JSON.stringify({
          "@type": "MessageCard",
          summary: `[Listen] ${event}`,
          text: formatTeamsMessage(event, data),
        });
        fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: teamsBody,
        }).catch((err) => console.error(`Webhook ${webhook.id} failed:`, err));
        continue;
      }

      // Custom webhook
      fetch(webhook.url, {
        method: "POST",
        headers,
        body,
      }).catch((err) => console.error(`Webhook ${webhook.id} failed:`, err));
    }
  } catch (err) {
    console.error("Webhook send error:", err);
  }
}

function formatSlackMessage(event: WebhookEvent, data: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    new_report: "📝 새로운 제보가 접수되었습니다",
    status_change: "🔄 제보 상태가 변경되었습니다",
    new_comment: "💬 새로운 댓글이 등록되었습니다",
    assigned: "👤 담당자가 배정되었습니다",
    sla_warning: "⚠️ SLA 기한이 초과되었습니다",
  };
  const num = data.report_number ? ` (${data.report_number})` : "";
  const detail = data.sla_type ? ` — ${data.sla_type}` : "";
  return `${labels[event] || event}${num}${detail}`;
}

function formatTeamsMessage(event: WebhookEvent, data: Record<string, unknown>): string {
  return formatSlackMessage(event, data);
}
