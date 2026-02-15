import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;

  // Support reporter token via query param as fallback for FormData uploads
  const reporterToken = new URL(request.url).searchParams.get("token") || undefined;
  const access = await verifyReportAccess(request, id, reporterToken);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: attachment } = await supabase
    .from("comment_attachments")
    .select("file_name, file_path, mime_type, comment_id")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  // Verify the comment belongs to this report
  const { data: comment } = await supabase
    .from("comments")
    .select("id")
    .eq("id", attachment.comment_id)
    .eq("report_id", access.reportId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  const { data: signedUrlData, error } = await supabase.storage
    .from("report-attachments")
    .createSignedUrl(attachment.file_path, 300);

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;

  const reporterToken = new URL(request.url).searchParams.get("token") || undefined;
  const access = await verifyReportAccess(request, id, reporterToken);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: attachment } = await supabase
    .from("comment_attachments")
    .select("id, file_path, file_name, comment_id")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  // Verify the comment belongs to this report and user can delete
  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_type")
    .eq("id", attachment.comment_id)
    .eq("report_id", access.reportId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  // Only allow deleting own comment attachments
  if (access.role === "reporter" && comment.author_type !== "reporter") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }
  if (access.role === "company_admin" && comment.author_type === "reporter") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // Delete from storage
  await supabase.storage.from("report-attachments").remove([attachment.file_path]);

  // Delete record
  await supabase.from("comment_attachments").delete().eq("id", attachmentId);

  return NextResponse.json({ message: "파일이 삭제되었습니다" });
}
