import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCode } from "@/lib/utils/generate-code";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from "@/lib/validators/report";

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Resolve report
  const column = isUUID(id) ? "id" : "report_number";
  const { data: report } = await supabase
    .from("reports")
    .select("id")
    .eq(column, id)
    .single();

  if (!report) {
    return NextResponse.json({ error: "제보를 찾을 수 없습니다" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
  }

  // Check existing attachments size
  const { data: existingAttachments } = await supabase
    .from("report_attachments")
    .select("file_size")
    .eq("report_id", report.id);

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
    const filePath = `reports/${report.id}/${generateCode(16)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("report-attachments")
      .upload(filePath, file, { contentType: file.type });

    if (!uploadError) {
      const { data: attachment } = await supabase
        .from("report_attachments")
        .insert({
          report_id: report.id,
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

  return NextResponse.json({ attachments: uploaded });
}
