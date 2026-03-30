import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/reports/draft?token=xxx&companyId=xxx
 * 임시저장된 제보 가져오기
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const companyId = request.nextUrl.searchParams.get("companyId");

  if (!token || !companyId) {
    return NextResponse.json({ error: "token과 companyId가 필요합니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: draft } = await supabase
    .from("report_drafts")
    .select("*")
    .eq("draft_token", token)
    .eq("company_id", companyId)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!draft) {
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({ draft });
}

/**
 * POST /api/reports/draft
 * 제보 임시저장 (생성 또는 업데이트)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { draftToken, companyId, title, content, reportTypeId, formData: extraData } = body;

  if (!draftToken || !companyId) {
    return NextResponse.json({ error: "draftToken과 companyId가 필요합니다" }, { status: 400 });
  }

  // Validate token format (prevent injection)
  if (typeof draftToken !== "string" || draftToken.length > 64) {
    return NextResponse.json({ error: "유효하지 않은 토큰입니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24시간

  // Upsert
  const { error } = await supabase
    .from("report_drafts")
    .upsert(
      {
        draft_token: draftToken,
        company_id: companyId,
        title: title || null,
        content: content || null,
        report_type_id: reportTypeId || null,
        form_data: extraData || {},
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "draft_token" }
    );

  if (error) {
    console.error("Draft save error:", error);
    return NextResponse.json({ error: "임시저장에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "임시저장되었습니다", expires_at: expiresAt });
}

/**
 * DELETE /api/reports/draft?token=xxx
 * 임시저장 삭제 (제보 제출 후)
 */
export async function DELETE(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token이 필요합니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase.from("report_drafts").delete().eq("draft_token", token);

  return NextResponse.json({ message: "삭제되었습니다" });
}
