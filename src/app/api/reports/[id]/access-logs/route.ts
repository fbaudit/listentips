import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyAuth } from "@/lib/auth/company-auth";
import { adminAuth } from "@/lib/auth/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Allow both company_admin and super_admin
  const companySession = await companyAuth();
  const adminSession = await adminAuth();

  if (!companySession?.user && !adminSession?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: logs, error } = await supabase
    .from("reporter_access_logs")
    .select("id, accessed_at, ip_hash")
    .eq("report_id", id)
    .order("accessed_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  return NextResponse.json({ logs: logs || [] });
}
