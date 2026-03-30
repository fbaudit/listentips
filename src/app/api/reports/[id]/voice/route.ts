import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReportAccess } from "@/lib/auth/report-access";
import { generateCode } from "@/lib/utils/generate-code";
import { addTimelineEvent } from "@/lib/utils/timeline";

const MAX_VOICE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await verifyReportAccess(request, id);
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("voice") as File | null;
  const durationStr = formData.get("duration") as string | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "음성 파일이 필요합니다" }, { status: 400 });
  }

  if (file.size > MAX_VOICE_SIZE) {
    return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다" }, { status: 400 });
  }

  const mimeType = file.type || "audio/webm";
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "지원하지 않는 오디오 형식입니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const ext = mimeType.split("/")[1] || "webm";
  const filePath = `reports/${id}/voice_${generateCode(12)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("report-attachments")
    .upload(filePath, file, { contentType: mimeType });

  if (uploadError) {
    console.error("Voice upload error:", uploadError);
    return NextResponse.json({ error: "음성 파일 업로드에 실패했습니다" }, { status: 500 });
  }

  const duration = durationStr ? parseInt(durationStr) : null;

  const { error: insertError } = await supabase.from("report_attachments").insert({
    report_id: id,
    file_name: `음성녹음.${ext}`,
    file_path: filePath,
    file_size: file.size,
    mime_type: mimeType,
    is_voice_recording: true,
    duration_seconds: duration,
  });

  if (insertError) {
    console.error("Voice attachment insert error:", insertError);
  }

  await addTimelineEvent({
    reportId: id,
    eventType: "comment_added",
    label: `음성 녹음이 첨부되었습니다 (${duration ? `${Math.floor(duration / 60)}분 ${duration % 60}초` : "시간 미상"})`,
    actorType: access.role === "reporter" ? "reporter" : "admin",
  });

  return NextResponse.json({ message: "음성 파일이 업로드되었습니다" });
}
