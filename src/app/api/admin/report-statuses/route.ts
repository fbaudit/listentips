import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAuth } from "@/lib/auth/admin-auth";
import { isAdminRole } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: statuses, error } = await supabase
    .from("report_statuses")
    .select("id, status_name, status_name_en, color_code, display_order, is_default, is_terminal")
    .eq("company_id", companyId)
    .order("display_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load statuses" }, { status: 500 });
  }

  return NextResponse.json({ statuses: statuses || [] });
}
