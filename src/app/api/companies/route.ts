import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";
import { generateCode } from "@/lib/utils/generate-code";

export async function GET(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("companies")
    .select(
      "id, name, company_code, industry, employee_count, is_active, preferred_locale, service_start, service_end, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company_code.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Companies fetch error:", error);
    return NextResponse.json({ error: "기업 조회 중 오류가 발생했습니다" }, { status: 500 });
  }

  // Fetch latest subscription status for each company
  const companyIds = (data || []).map((c: { id: string }) => c.id);
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("company_id, status, end_date")
    .in("company_id", companyIds)
    .order("created_at", { ascending: false });

  // Build a map of company_id → latest subscription
  const subMap = new Map<string, { status: string; end_date: string | null }>();
  for (const sub of subscriptions || []) {
    if (!subMap.has(sub.company_id)) {
      subMap.set(sub.company_id, { status: sub.status, end_date: sub.end_date });
    }
  }

  const companies = (data || []).map((c: Record<string, unknown>) => {
    const sub = subMap.get(c.id as string);
    return {
      ...c,
      subscription_status: sub?.status || null,
      subscription_end_date: sub?.end_date || null,
    };
  });

  return NextResponse.json({
    companies,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { companyName, businessNumber, industry, employeeCount, address, preferredLocale } = body;

  if (!companyName) {
    return NextResponse.json({ error: "회사명은 필수입니다" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Generate unique company code
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

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      name: companyName,
      company_code: companyCode,
      business_number: businessNumber || null,
      industry: industry || null,
      employee_count: employeeCount || null,
      address: address || null,
      preferred_locale: preferredLocale || "ko",
      is_active: true,
    })
    .select("id, name, company_code")
    .single();

  if (error) {
    console.error("Company creation error:", error);
    return NextResponse.json({ error: "기업 생성 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json(company, { status: 201 });
}
