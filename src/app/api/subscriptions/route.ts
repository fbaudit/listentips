import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";
import { auth } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  // Try admin session first (super_admin sees all subscriptions)
  const adminSession = await adminAuth();
  if (adminSession?.user?.role && isAdminRole(adminSession.user.role)) {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("subscriptions")
      .select(
        "id, company_id, plan_type, status, start_date, end_date, amount, currency, payment_provider, created_at, companies(name, company_code)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Subscriptions fetch error:", error);
      return NextResponse.json({ error: "구독 조회 오류" }, { status: 500 });
    }

    return NextResponse.json({
      subscriptions: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  }

  // Try company session (company_admin sees own subscription)
  const companySession = await auth();
  if (!companySession?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", companySession.user.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ subscription: null });
  }

  return NextResponse.json({ subscription: data });
}

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { companyId, planType, amount, currency, paymentProvider } = body;

  if (!companyId || !planType) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Deactivate existing subscriptions
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("company_id", companyId)
    .eq("status", "active");

  const startDate = new Date();
  const endDate = new Date(startDate);
  if (planType === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setDate(endDate.getDate() + 30);
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      company_id: companyId,
      plan_type: planType,
      status: "active",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      amount: amount || 0,
      currency: currency || "KRW",
      payment_provider: paymentProvider || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Subscription creation error:", error);
    return NextResponse.json({ error: "구독 생성 오류" }, { status: 500 });
  }

  // Update company service dates
  await supabase
    .from("companies")
    .update({
      service_start: startDate.toISOString(),
      service_end: endDate.toISOString(),
    })
    .eq("id", companyId);

  return NextResponse.json(data, { status: 201 });
}
