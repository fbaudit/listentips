import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { deleteFromGemini, getGeminiApiKey } from "@/lib/ai/gemini-files";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify ownership
  const { data: document, error } = await supabase
    .from("company_documents")
    .select("id, file_path, gemini_file_name")
    .eq("id", id)
    .eq("company_id", session.user.companyId)
    .single();

  if (error || !document) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다" }, { status: 404 });
  }

  // Delete from Gemini File API (if uploaded)
  if (document.gemini_file_name) {
    try {
      const geminiKey = getGeminiApiKey();
      await deleteFromGemini(geminiKey, document.gemini_file_name);
    } catch (err) {
      // Non-critical: Gemini files auto-expire after 48h
      console.warn("Gemini file delete failed (will auto-expire):", err);
    }
  }

  // Delete from storage (skip inline-stored documents)
  if (document.file_path && !document.file_path.startsWith("inline/")) {
    await supabase.storage.from("company-assets").remove([document.file_path]);
  }

  // Delete from database
  await supabase.from("company_documents").delete().eq("id", id);

  return NextResponse.json({ message: "삭제되었습니다" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (body.file_name !== undefined) updateData.file_name = body.file_name;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다" }, { status: 400 });
  }

  const { error } = await supabase
    .from("company_documents")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", session.user.companyId);

  if (error) {
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "수정되었습니다" });
}
