import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/utils/password";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";

export async function GET() {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, company_name, admin_name, admin_email, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json(applications);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      companyName,
      businessNumber,
      industry,
      employeeCount,
      address,
      department,
      channelName,
      reportTypes,
      welcomeMessage,
      reportGuideMessage,
      contentBlocks,
      displayFields,
      preferredLocale,
      useAiValidation,
      useChatbot,
      adminName,
      adminEmail,
      adminPhone,
      adminUsername,
      adminPassword,
    } = body;

    if (!companyName || !adminName || !adminEmail || !adminUsername || !adminPassword) {
      return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if email or username already used
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${adminEmail},username.eq.${adminUsername}`)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일 또는 아이디입니다" },
        { status: 409 }
      );
    }

    // Check existing application with same email
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("admin_email", adminEmail)
      .eq("status", "pending")
      .single();

    if (existingApp) {
      return NextResponse.json(
        { error: "이미 접수된 신청이 있습니다" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(adminPassword);

    const { data: application, error } = await supabase
      .from("applications")
      .insert({
        company_name: companyName,
        business_number: businessNumber || null,
        industry: industry || null,
        employee_count: employeeCount || null,
        address: address || null,
        department: department || null,
        channel_name: channelName || null,
        report_types: reportTypes || [],
        welcome_message: welcomeMessage || null,
        report_guide_message: reportGuideMessage || null,
        content_blocks: contentBlocks || [],
        display_fields: displayFields || null,
        preferred_locale: preferredLocale || "ko",
        use_ai_validation: useAiValidation || false,
        use_chatbot: useChatbot || false,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_phone: adminPhone || null,
        admin_username: adminUsername,
        admin_password_hash: passwordHash,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Application insert error:", error);
      return NextResponse.json({ error: "신청 접수 중 오류가 발생했습니다" }, { status: 500 });
    }

    // TODO: Send notification email to super admins

    return NextResponse.json({
      applicationId: application.id,
      message: "신청이 접수되었습니다",
    });
  } catch (error) {
    console.error("Application error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
