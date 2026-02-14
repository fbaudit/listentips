import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { getCompanyDataKey, encryptWithKey, decryptWithKey, isEncrypted } from "@/lib/utils/data-encryption";
import { notifyCompanyAdmins } from "@/lib/utils/notify-company-admins";

// Check if the id looks like a UUID
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify access (reporter token, company admin, or super admin)
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const column = isUUID(id) ? "id" : "report_number";

  const { data: report, error } = await supabase
    .from("reports")
    .select(`
      id, report_number, title, content, created_at, updated_at, company_id,
      who_field, what_field, when_field, where_field, why_field, how_field,
      ai_validation_score, view_count,
      report_type:report_types(id, type_name, type_name_en),
      status:report_statuses(id, status_name, status_name_en, color_code, is_default),
      attachments:report_attachments(id, file_name, file_path, file_size, mime_type)
    `)
    .eq(column, id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Decrypt title and content if encrypted
  const reportData = report as Record<string, unknown>;
  const encKeyHeader = request.headers.get("x-encryption-key");

  // Reporter: auto-decrypt; Admin: must provide key via header
  const dataKey = access.role === "reporter"
    ? (encKeyHeader || await getCompanyDataKey(access.companyId))
    : encKeyHeader;

  if (dataKey) {
    if (isEncrypted(reportData.title as string)) {
      try {
        reportData.title = decryptWithKey(reportData.title as string, dataKey);
      } catch {
        reportData.title = "[복호화 실패]";
      }
    }
    if (isEncrypted(reportData.content as string)) {
      try {
        reportData.content = decryptWithKey(reportData.content as string, dataKey);
      } catch {
        reportData.content = "[복호화 실패]";
      }
    }
  } else {
    if (isEncrypted(reportData.title as string)) reportData.title = "[암호화됨]";
    if (isEncrypted(reportData.content as string)) reportData.content = "[암호화됨]";
  }

  return NextResponse.json({ report: reportData });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify access
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  // Resolve report ID (supports both UUID and report_number)
  const column = isUUID(id) ? "id" : "report_number";
  const { data: current } = await supabase
    .from("reports")
    .select("id, title, content, status_id, company_id")
    .eq(column, id)
    .single();

  if (!current) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const reportId = current.id;
  const updateData: Record<string, unknown> = {};
  const editHistory: { field_name: string; old_value: string; new_value: string }[] = [];

  // Get encryption key for re-encrypting updated fields
  const dataKey = await getCompanyDataKey(current.company_id);

  if (body.title && body.title !== current.title) {
    const encTitle = dataKey ? encryptWithKey(body.title, dataKey) : body.title;
    updateData.title = encTitle;
    editHistory.push({ field_name: "title", old_value: current.title || "", new_value: body.title });
  }
  if (body.content && body.content !== current.content) {
    const encContent = dataKey ? encryptWithKey(body.content, dataKey) : body.content;
    updateData.content = encContent;
    editHistory.push({ field_name: "content", old_value: current.content || "", new_value: body.content });
  }

  // Support both statusId (UUID) and statusName (string lookup)
  if (body.statusId && body.statusId !== current.status_id) {
    updateData.status_id = body.statusId;
    editHistory.push({ field_name: "status_id", old_value: current.status_id || "", new_value: body.statusId });
  } else if (body.statusName) {
    const { data: statusRecord } = await supabase
      .from("report_statuses")
      .select("id, status_name")
      .eq("company_id", current.company_id)
      .eq("status_name", body.statusName)
      .single();

    if (statusRecord && statusRecord.id !== current.status_id) {
      updateData.status_id = statusRecord.id;
      editHistory.push({ field_name: "status_id", old_value: current.status_id || "", new_value: statusRecord.id });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  const { error } = await supabase
    .from("reports")
    .update(updateData)
    .eq("id", reportId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Record edit history
  if (editHistory.length > 0) {
    await supabase.from("report_edit_history").insert(
      editHistory.map((h) => ({
        report_id: reportId,
        ...h,
        edited_by: body.editedBy || "reporter",
      }))
    );
  }

  // Notify company admins when reporter modifies title/content
  const reporterContentChanges = editHistory.filter(
    (h) => h.field_name === "title" || h.field_name === "content"
  );
  if (access.role === "reporter" && reporterContentChanges.length > 0) {
    const { data: reportInfo } = await supabase
      .from("reports")
      .select("report_number")
      .eq("id", reportId)
      .single();

    if (reportInfo) {
      const origin = request.nextUrl.origin;
      notifyCompanyAdmins({
        companyId: current.company_id,
        reportId,
        reportNumber: reportInfo.report_number,
        eventType: "report_modified",
        title: "제보 내용이 수정되었습니다",
        message: `제보자가 제보 내용을 수정했습니다. (${reporterContentChanges.map((h) => h.field_name === "title" ? "제목" : "내용").join(", ")} 변경)`,
        origin,
      }).catch((err) => console.error("Notification error:", err));
    }
  }

  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(
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

  const column = isUUID(id) ? "id" : "report_number";
  const { data: report } = await supabase
    .from("reports")
    .select("id, status_id, report_statuses(is_default)")
    .eq(column, id)
    .single();

  if (!report) {
    return NextResponse.json({ error: "제보를 찾을 수 없습니다" }, { status: 404 });
  }

  const statusData = report.report_statuses as unknown;
  const status = (Array.isArray(statusData) ? statusData[0] : statusData) as { is_default: boolean } | null;
  if (!status?.is_default) {
    return NextResponse.json(
      { error: "접수대기 상태의 제보만 삭제할 수 있습니다. 현재 처리가 진행 중인 제보는 삭제가 불가능합니다." },
      { status: 403 }
    );
  }

  // Delete attachments from storage
  const { data: attachments } = await supabase
    .from("report_attachments")
    .select("file_path")
    .eq("report_id", report.id);

  if (attachments && attachments.length > 0) {
    await supabase.storage
      .from("report-attachments")
      .remove(attachments.map((a) => a.file_path));
  }

  // Delete related records then report
  await supabase.from("comment_attachments").delete().in(
    "comment_id",
    (await supabase.from("comments").select("id").eq("report_id", report.id)).data?.map((c) => c.id) || []
  );
  await supabase.from("comments").delete().eq("report_id", report.id);
  await supabase.from("report_attachments").delete().eq("report_id", report.id);
  await supabase.from("report_edit_history").delete().eq("report_id", report.id);

  const { error } = await supabase.from("reports").delete().eq("id", report.id);

  if (error) {
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({ message: "제보가 삭제되었습니다" });
}
