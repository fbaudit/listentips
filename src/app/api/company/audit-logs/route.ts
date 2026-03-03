import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers can view audit logs
  const supabase = createAdminClient();
  const { data: requester } = await supabase
    .from("users")
    .select("company_role")
    .eq("id", session.user.id)
    .single();

  if (requester?.company_role !== "manager") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entityType");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("company_id", session.user.companyId)
    .order("created_at", { ascending: false });

  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }

  return NextResponse.json({
    logs: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
