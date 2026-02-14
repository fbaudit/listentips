import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { notifyCompanyAdmins } from "@/lib/utils/notify-company-admins";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;

  // Verify access to the parent report
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: attachment } = await supabase
    .from("report_attachments")
    .select("file_name, file_path, mime_type")
    .eq("id", attachmentId)
    .eq("report_id", access.reportId)
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;

  // Verify access to the parent report
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: attachment } = await supabase
    .from("report_attachments")
    .select("id, file_path, file_name")
    .eq("id", attachmentId)
    .eq("report_id", access.reportId)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from("report-attachments").remove([attachment.file_path]);

  // Delete record
  await supabase.from("report_attachments").delete().eq("id", attachmentId);

  // Record edit history for attachment removal
  await supabase.from("report_edit_history").insert({
    report_id: access.reportId,
    field_name: "attachment_removed",
    old_value: attachment.file_name,
    new_value: null,
    edited_by: "reporter",
  });

  // Notify company admins
  const { data: reportInfo } = await supabase
    .from("reports")
    .select("report_number")
    .eq("id", access.reportId)
    .single();

  if (reportInfo) {
    const origin = request.nextUrl.origin;
    notifyCompanyAdmins({
      companyId: access.companyId,
      reportId: access.reportId,
      reportNumber: reportInfo.report_number,
      eventType: "report_modified",
      title: "첨부파일이 삭제되었습니다",
      message: `제보자가 첨부파일을 삭제했습니다. (${attachment.file_name})`,
      origin,
    }).catch((err) => console.error("Notification error:", err));
  }

  return NextResponse.json({ message: "파일이 삭제되었습니다" });
}
