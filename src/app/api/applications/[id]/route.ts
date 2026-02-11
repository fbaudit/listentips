import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { generateCode } from "@/lib/utils/generate-code";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
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
        welcome_message: application.welcome_message,
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

    // 5. Create report types from application
    const reportTypes: string[] = application.report_types || [];
    if (reportTypes.length > 0) {
      const reportTypeRows = reportTypes.map((typeName: string, index: number) => ({
        company_id: company.id,
        type_name: typeName,
        display_order: index + 1,
        is_active: true,
      }));
      const { error: rtError } = await supabase
        .from("report_types")
        .insert(reportTypeRows);
      if (rtError) {
        console.error("Report types creation error:", rtError);
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

    // TODO: Send welcome email with login credentials

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
