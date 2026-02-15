import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { generateCode } from "@/lib/utils/generate-code";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/validators/report";

const COMMENT_MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB per comment

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Parse FormData first to extract reporter token for auth fallback
  const formData = await request.formData();
  const reporterToken = formData.get("reporterToken") as string | null;

  const access = await verifyReportAccess(request, id, reporterToken || undefined);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const commentId = formData.get("commentId") as string;
  const files = formData.getAll("files") as File[];

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
  }

  // Verify the comment belongs to this report
  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_type, report_id")
    .eq("id", commentId)
    .eq("report_id", access.reportId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Check total size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > COMMENT_MAX_TOTAL_SIZE) {
    return NextResponse.json({ error: "첨부파일 크기는 10MB를 초과할 수 없습니다" }, { status: 400 });
  }

  const uploaded: { id: string; file_name: string; file_size: number }[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push(`${file.name}: 허용되지 않는 파일 형식입니다 (${file.type || "unknown"})`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: 파일 크기가 10MB를 초과합니다`);
      continue;
    }

    try {
      const ext = file.name.split(".").pop();
      const filePath = `comments/${access.reportId}/${commentId}/${generateCode(16)}.${ext}`;

      // Read file data as ArrayBuffer then convert to Uint8Array for upload
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      if (fileData.length === 0) {
        errors.push(`${file.name}: 파일 데이터를 읽을 수 없습니다`);
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from("report-attachments")
        .upload(filePath, fileData, {
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Comment attachment upload error:", file.name, uploadError.message);
        errors.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: attachment } = await supabase
        .from("comment_attachments")
        .insert({
          comment_id: commentId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        })
        .select("id, file_name, file_size")
        .single();

      if (attachment) {
        uploaded.push(attachment);
      }
    } catch (err) {
      console.error("Comment attachment processing error:", file.name, err);
      errors.push(`${file.name}: 처리 중 오류 발생`);
    }
  }

  return NextResponse.json({ attachments: uploaded, errors: errors.length > 0 ? errors : undefined });
}
