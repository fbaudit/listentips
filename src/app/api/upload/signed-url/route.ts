import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileName, fileType, fileSize, bucket } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json({ error: "허용되지 않는 파일 형식입니다" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const ext = fileName.split(".").pop() || "";
    const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storageBucket = bucket || "attachments";
    const path = `${session.user.companyId || "general"}/${safeName}`;

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Signed URL error:", error);
      return NextResponse.json({ error: "업로드 URL 생성 오류" }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    });
  } catch (error) {
    console.error("Upload signed URL error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
