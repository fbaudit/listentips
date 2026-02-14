import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { uploadToGemini, getGeminiApiKey } from "@/lib/ai/gemini-files";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: documents, error } = await supabase
    .from("company_documents")
    .select("id, file_name, file_path, file_size, mime_type, content_text, created_at")
    .eq("company_id", session.user.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "문서 조회 오류" }, { status: 500 });
  }

  return NextResponse.json({ documents: documents || [] });
}

const ALLOWED_TYPES = ["text/plain", "text/markdown"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
  }

  const isMd = file.name.endsWith(".md");
  if (!ALLOWED_TYPES.includes(file.type) && !isMd) {
    return NextResponse.json({ error: "TXT, MD 파일만 지원됩니다" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  const contentText = await file.text();
  const mimeType = file.type || "text/plain";

  // Insert database record (content_text for RAG fallback)
  const { data: document, error: insertError } = await supabase
    .from("company_documents")
    .insert({
      company_id: companyId,
      file_name: file.name,
      file_path: `inline/${file.name}`,
      file_size: file.size,
      mime_type: mimeType,
      content_text: contentText,
    })
    .select("id, file_name, file_size, mime_type, created_at")
    .single();

  if (insertError) {
    console.error("Document insert error:", insertError);
    return NextResponse.json(
      { error: `문서 저장 오류: ${insertError.message}` },
      { status: 500 }
    );
  }

  // Upload to Gemini File API (for fileData RAG)
  try {
    const geminiKey = getGeminiApiKey();
    const geminiFile = await uploadToGemini(geminiKey, file.name, contentText, mimeType);

    await supabase
      .from("company_documents")
      .update({
        gemini_file_uri: geminiFile.uri,
        gemini_file_name: geminiFile.name,
        gemini_uploaded_at: new Date().toISOString(),
      })
      .eq("id", document.id);
  } catch (err) {
    // Gemini upload failure is non-critical - text fallback still works
    console.warn("Gemini file upload failed (text fallback available):", err);
  }

  return NextResponse.json({ document });
}
