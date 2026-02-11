import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { attachmentId } = await params;
  const supabase = createAdminClient();

  const { data: attachment } = await supabase
    .from("report_attachments")
    .select("file_name, file_path, mime_type")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  const { data: signedUrlData, error } = await supabase.storage
    .from("report-attachments")
    .createSignedUrl(attachment.file_path, 300); // 5분 유효

  if (error || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "파일 다운로드 URL 생성에 실패했습니다" }, { status: 500 });
  }

  return NextResponse.json({
    url: signedUrlData.signedUrl,
    fileName: attachment.file_name,
    mimeType: attachment.mime_type,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { attachmentId } = await params;
  const supabase = createAdminClient();

  const { data: attachment } = await supabase
    .from("report_attachments")
    .select("id, file_path")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from("report-attachments").remove([attachment.file_path]);

  // Delete record
  await supabase.from("report_attachments").delete().eq("id", attachmentId);

  return NextResponse.json({ message: "파일이 삭제되었습니다" });
}
