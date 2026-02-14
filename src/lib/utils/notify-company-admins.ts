import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/utils/email";

interface NotifyOptions {
  companyId: string;
  reportId: string;
  reportNumber: string;
  eventType: "new_report" | "report_modified" | "new_comment";
  title: string;
  message: string;
  origin: string;
}

/**
 * Notify all active company admins about a report event.
 * Respects each user's notification preferences.
 * Sends emails asynchronously and records notifications in DB.
 */
export async function notifyCompanyAdmins(options: NotifyOptions): Promise<void> {
  const supabase = createAdminClient();

  // 1. Fetch active company admins
  const { data: admins } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("company_id", options.companyId)
    .eq("role", "company_admin")
    .eq("is_active", true);

  if (!admins || admins.length === 0) return;

  // 2. Fetch notification preferences for all admins at once
  const adminIds = admins.map((a) => a.id);
  const { data: prefs } = await supabase
    .from("user_notification_preferences")
    .select("user_id, email_enabled")
    .in("user_id", adminIds)
    .eq("event_type", options.eventType);

  const prefMap = new Map<string, boolean>();
  (prefs || []).forEach((p) => prefMap.set(p.user_id, p.email_enabled));

  // 3. Build email HTML
  const reportLink = `${options.origin}/company/reports/${options.reportId}`;
  const emailHtml = buildNotificationEmail({
    reportNumber: options.reportNumber,
    title: options.title,
    message: options.message,
    reportLink,
  });

  const emailSubject = `[Listen] ${options.title} (${options.reportNumber})`;

  // 4. Process each admin
  const notificationInserts: Array<{
    company_id: string;
    user_id: string;
    type: string;
    channel: string;
    title: string;
    message: string;
    link: string;
    recipient: string;
    status: string;
    sent_at: string;
  }> = [];

  const now = new Date().toISOString();

  for (const admin of admins) {
    // Default to email_enabled = true if no preference exists
    const emailEnabled = prefMap.get(admin.id) ?? true;

    if (emailEnabled) {
      sendEmail({
        to: admin.email,
        subject: emailSubject,
        html: emailHtml,
      }).catch((err) =>
        console.error(`Notification email failed for ${admin.email}:`, err)
      );
    }

    notificationInserts.push({
      company_id: options.companyId,
      user_id: admin.id,
      type: mapEventType(options.eventType),
      channel: emailEnabled ? "email" : "in_app",
      title: options.title,
      message: options.message,
      link: `/company/reports/${options.reportId}`,
      recipient: admin.email,
      status: emailEnabled ? "sent" : "pending",
      sent_at: now,
    });
  }

  // 5. Insert all notifications at once
  if (notificationInserts.length > 0) {
    await supabase.from("notifications").insert(notificationInserts).catch((err: unknown) =>
      console.error("Notification insert error:", err)
    );
  }
}

function mapEventType(eventType: string): string {
  switch (eventType) {
    case "new_report": return "new_report";
    case "new_comment": return "new_comment";
    case "report_modified": return "report_modified";
    default: return "system";
  }
}

function buildNotificationEmail(params: {
  reportNumber: string;
  title: string;
  message: string;
  reportLink: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">Listen</span>
          <span style="color:#a1a1aa;font-size:14px;margin-left:8px;">모두의 제보채널</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">${params.title}</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#52525b;">
            ${params.message}
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
            <tr><td>
              <table cellpadding="4" cellspacing="0" style="font-size:14px;color:#18181b;">
                <tr>
                  <td style="color:#71717a;padding-right:16px;">접수번호</td>
                  <td><strong style="font-family:monospace;font-size:15px;">${params.reportNumber}</strong></td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center" style="padding:6px;">
                <a href="${params.reportLink}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                  제보 상세 확인
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#71717a;">
            위 버튼이 작동하지 않을 경우 아래 주소를 브라우저에 직접 입력해 주세요.<br/>
            ${params.reportLink}
          </p>
        </td></tr>
        <tr><td style="background:#f4f4f5;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#71717a;">본 메일은 Listen 서비스에서 자동 발송된 메일입니다.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#71717a;">알림 설정은 기업 관리자 페이지에서 변경할 수 있습니다.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
