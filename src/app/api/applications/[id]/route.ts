import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";
import { generateCode } from "@/lib/utils/generate-code";
import { sendEmail } from "@/lib/utils/email";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !application) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(application);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Application delete error:", error);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "신청이 삭제되었습니다" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, reviewNotes } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "유효하지 않은 작업입니다" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (fetchError || !application) {
    return NextResponse.json(
      { error: "대기 중인 신청을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("applications")
      .update({
        status: "rejected",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", id);

    if (error) {
      console.error("Application reject error:", error);
      return NextResponse.json({ error: "처리 중 오류가 발생했습니다" }, { status: 500 });
    }

    // Send rejection email
    const origin = request.nextUrl.origin;
    const applyUrl = `${origin}/apply`;
    sendEmail({
      to: application.admin_email,
      subject: `[Listen] ${application.company_name} 서비스 신청 결과 안내`,
      html: buildRejectionEmail({
        companyName: application.company_name,
        adminName: application.admin_name,
        reviewNotes: reviewNotes || null,
        applyUrl,
      }),
    }).catch((err) => console.error("Rejection email error:", err));

    return NextResponse.json({ message: "신청이 거절되었습니다" });
  }

  // Approve flow: create company, user, subscription
  try {
    // 1. Generate unique company code
    let companyCode = generateCode(8);
    let retries = 0;
    while (retries < 10) {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("company_code", companyCode)
        .single();
      if (!existing) break;
      companyCode = generateCode(8);
      retries++;
    }

    // 2. Create company
    const now = new Date();
    const serviceEnd = new Date(now);
    serviceEnd.setDate(serviceEnd.getDate() + 30);

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: application.company_name,
        company_code: companyCode,
        business_number: application.business_number,
        industry: application.industry,
        employee_count: application.employee_count,
        address: application.address,
        channel_name: application.channel_name || null,
        welcome_message: application.welcome_message,
        report_guide_message: application.report_guide_message || null,
        content_blocks: application.content_blocks || [],
        preferred_locale: application.preferred_locale || "ko",
        use_ai_validation: application.use_ai_validation || false,
        use_chatbot: application.use_chatbot || false,
        is_active: true,
        service_start: now.toISOString(),
        service_end: serviceEnd.toISOString(),
      })
      .select("id")
      .single();

    if (companyError || !company) {
      console.error("Company creation error:", companyError);
      return NextResponse.json({ error: "회사 생성 중 오류가 발생했습니다" }, { status: 500 });
    }

    // 3. Create company admin user
    const { error: userError } = await supabase.from("users").insert({
      email: application.admin_email,
      username: application.admin_username,
      password_hash: application.admin_password_hash,
      name: application.admin_name,
      phone: application.admin_phone,
      role: "company_admin",
      company_id: company.id,
      is_active: true,
      valid_from: now.toISOString(),
      valid_to: serviceEnd.toISOString(),
    });

    if (userError) {
      console.error("User creation error:", userError);
      // Rollback: delete company
      await supabase.from("companies").delete().eq("id", company.id);
      return NextResponse.json({ error: "사용자 생성 중 오류가 발생했습니다" }, { status: 500 });
    }

    // 4. Create free trial subscription
    const { error: subError } = await supabase.from("subscriptions").insert({
      company_id: company.id,
      plan_type: "free_trial",
      status: "active",
      start_date: now.toISOString(),
      end_date: serviceEnd.toISOString(),
      amount: 0,
      currency: "KRW",
    });

    if (subError) {
      console.error("Subscription creation error:", subError);
    }

    // 5. Report types: the setup_company_defaults() trigger copies ALL default types.
    // Remove any that weren't selected by the applicant.
    const selectedTypes: string[] = application.report_types || [];
    if (selectedTypes.length > 0) {
      const { data: allTypes } = await supabase
        .from("report_types")
        .select("id, type_name")
        .eq("company_id", company.id);

      if (allTypes) {
        const idsToDelete = allTypes
          .filter((t) => !selectedTypes.includes(t.type_name))
          .map((t) => t.id);
        if (idsToDelete.length > 0) {
          const { error: rtDeleteError } = await supabase
            .from("report_types")
            .delete()
            .in("id", idsToDelete);
          if (rtDeleteError) {
            console.error("Report types cleanup error:", rtDeleteError);
          }
        }
      }
    }

    // 6. Update application status
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "approved",
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Application update error:", updateError);
    }

    // 7. Send approval email
    const origin = request.nextUrl.origin;
    const reportUrl = `${origin}/report/${companyCode}`;
    const adminLoginUrl = `${origin}/company/login`;
    sendEmail({
      to: application.admin_email,
      subject: `[Listen] ${application.company_name} 서비스 신청이 승인되었습니다`,
      html: buildApprovalEmail({
        companyName: application.company_name,
        adminName: application.admin_name,
        companyCode,
        adminUsername: application.admin_username,
        reportUrl,
        adminLoginUrl,
        serviceEnd: serviceEnd.toLocaleDateString("ko-KR"),
      }),
    }).catch((err) => console.error("Approval email error:", err));

    return NextResponse.json({
      message: "신청이 승인되었습니다",
      companyCode,
      companyId: company.id,
    });
  } catch (error) {
    console.error("Application approval error:", error);
    return NextResponse.json({ error: "승인 처리 중 오류가 발생했습니다" }, { status: 500 });
  }
}

// --- Email Templates ---

function emailWrapper(content: string) {
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
          ${content}
        </td></tr>
        <tr><td style="background:#f4f4f5;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#71717a;">본 메일은 Listen 서비스에서 자동 발송된 메일입니다.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#71717a;">문의사항이 있으시면 관리자에게 연락해 주세요.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildApprovalEmail(params: {
  companyName: string;
  adminName: string;
  companyCode: string;
  adminUsername: string;
  reportUrl: string;
  adminLoginUrl: string;
  serviceEnd: string;
}) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">서비스 신청이 승인되었습니다</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">
      안녕하세요, <strong>${params.adminName}</strong>님.<br/>
      <strong>${params.companyName}</strong>의 Listen 서비스 신청이 정상적으로 승인되었습니다.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <p style="margin:0 0 12px;font-size:14px;color:#71717a;">계정 정보</p>
        <table cellpadding="4" cellspacing="0" style="font-size:14px;color:#18181b;">
          <tr><td style="color:#71717a;padding-right:16px;">기업 코드</td><td><strong>${params.companyCode}</strong></td></tr>
          <tr><td style="color:#71717a;padding-right:16px;">로그인 ID</td><td>${params.adminUsername}</td></tr>
          <tr><td style="color:#71717a;padding-right:16px;">무료체험 기간</td><td>${params.serviceEnd}까지</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td align="center" style="padding:6px;">
          <a href="${params.adminLoginUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">기업 관리자 로그인</a>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center" style="padding:6px;">
          <a href="${params.reportUrl}" style="display:inline-block;background:#ffffff;color:#18181b;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;border:1px solid #d4d4d8;">제보접수 페이지 바로가기</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#71717a;">
      위 버튼이 작동하지 않을 경우 아래 주소를 브라우저에 직접 입력해 주세요.<br/>
      관리자 로그인: ${params.adminLoginUrl}<br/>
      제보접수 페이지: ${params.reportUrl}
    </p>
  `);
}

function buildRejectionEmail(params: {
  companyName: string;
  adminName: string;
  reviewNotes: string | null;
  applyUrl: string;
}) {
  const notesSection = params.reviewNotes
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #ef4444;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:13px;color:#71717a;">검토 의견</p>
          <p style="margin:0;font-size:14px;color:#18181b;">${params.reviewNotes}</p>
        </td></tr>
      </table>`
    : "";

  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">서비스 신청 결과 안내</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">
      안녕하세요, <strong>${params.adminName}</strong>님.<br/>
      <strong>${params.companyName}</strong>의 Listen 서비스 신청을 검토한 결과,<br/>
      안타깝게도 이번 신청은 승인이 어려운 점 양해 부탁드립니다.
    </p>

    ${notesSection}

    <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
      신청 내용을 보완하신 후 다시 신청해 주시면 재검토하겠습니다.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center" style="padding:6px;">
          <a href="${params.applyUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">다시 신청하기</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#71717a;">
      궁금하신 사항이 있으시면 언제든지 문의해 주세요.
    </p>
  `);
}
