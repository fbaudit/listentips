import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: timeline, error } = await supabase
    .from("report_timeline")
    .select("id, event_type, event_label, actor_type, created_at, metadata")
    .eq("report_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Timeline fetch error:", error);
    return NextResponse.json({ error: "타임라인 조회에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json({ timeline: timeline || [] });
}
