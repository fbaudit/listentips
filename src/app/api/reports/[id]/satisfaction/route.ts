import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";

/**
 * POST /api/reports/[id]/satisfaction
 * 제보자 만족도 조사 (처리 완료된 제보에 대해)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "평점은 1~5 사이여야 합니다" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 이미 평가했는지 확인
  const { data: report } = await supabase
    .from("reports")
    .select("satisfaction_rating")
    .eq("id", id)
    .single();

  if (report?.satisfaction_rating) {
    return NextResponse.json({ error: "이미 평가하셨습니다" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reports")
    .update({
      satisfaction_rating: rating,
      satisfaction_comment: typeof comment === "string" ? comment.slice(0, 500) : null,
      satisfaction_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "평가 저장에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "평가가 저장되었습니다" });
}
