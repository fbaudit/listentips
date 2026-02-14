import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { generateCode } from "@/lib/utils/generate-code";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from "@/lib/validators/report";
import { notifyCompanyAdmins } from "@/lib/utils/notify-company-admins";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify access
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
  }

  // Check existing attachments size
  const { data: existingAttachments } = await supabase
    .from("report_attachments")
    .select("file_size")
    .eq("report_id", access.reportId);

  const existingSize = (existingAttachments || []).reduce((sum, a) => sum + (a.file_size || 0), 0);
  const newSize = files.reduce((sum, f) => sum + f.size, 0);

  if (existingSize + newSize > MAX_TOTAL_SIZE) {
    return NextResponse.json({ error: "총 파일 크기는 50MB를 초과할 수 없습니다" }, { status: 400 });
  }

  const uploaded: { id: string; file_name: string; file_path: string; file_size: number; mime_type: string }[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) continue;
    if (file.size > MAX_FILE_SIZE) continue;

    const ext = file.name.split(".").pop();
    const filePath = `reports/${access.reportId}/${generateCode(16)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("report-attachments")
      .upload(filePath, file, { contentType: file.type });

    if (!uploadError) {
      const { data: attachment } = await supabase
        .from("report_attachments")
        .insert({
          report_id: access.reportId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        })
        .select("id, file_name, file_path, file_size, mime_type")
        .single();

      if (attachment) {
        uploaded.push(attachment);
      }
    }
  }

  // Record edit history and notify for attachment additions
  if (uploaded.length > 0) {
    await supabase.from("report_edit_history").insert(
      uploaded.map((att) => ({
        report_id: access.reportId,
        field_name: "attachment_added",
        old_value: null,
        new_value: att.file_name,
        edited_by: "reporter",
      }))
    );

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
        title: "첨부파일이 추가되었습니다",
        message: `제보자가 첨부파일 ${uploaded.length}개를 추가했습니다.`,
        origin,
      }).catch((err) => console.error("Notification error:", err));
    }
  }

  return NextResponse.json({ attachments: uploaded });
}
