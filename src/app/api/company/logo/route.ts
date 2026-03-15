import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { removeBackground } from "@/lib/utils/remove-bg";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("logo") as File;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "PNG, JPG, SVG, WebP 형식만 지원됩니다" }, { status: 400 });
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "파일 크기는 2MB 이하여야 합니다" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;
  const timestamp = Date.now();

  // Auto background removal for raster images (skip SVG)
  let uploadBuffer: Buffer;
  let uploadContentType: string;
  let uploadExt: string;

  if (file.type === "image/svg+xml") {
    uploadBuffer = Buffer.from(await file.arrayBuffer());
    uploadContentType = file.type;
    uploadExt = "svg";
  } else {
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    try {
      const processed = await removeBackground(originalBuffer);
      if (processed) {
        uploadBuffer = processed;
        uploadContentType = "image/png";
        uploadExt = "png";
      } else {
        // Already transparent or no clear background — upload as-is
        uploadBuffer = originalBuffer;
        uploadContentType = file.type;
        uploadExt = file.name.split(".").pop() || "png";
      }
    } catch (err) {
      console.error("Background removal error (uploading original):", err);
      uploadBuffer = originalBuffer;
      uploadContentType = file.type;
      uploadExt = file.name.split(".").pop() || "png";
    }
  }

  const filePath = `logos/${companyId}/logo_${timestamp}.${uploadExt}`;

  // Delete old logo files if exist
  const { data: oldFiles } = await supabase.storage
    .from("company-assets")
    .list(`logos/${companyId}`);

  if (oldFiles && oldFiles.length > 0) {
    await supabase.storage
      .from("company-assets")
      .remove(oldFiles.map((f) => `logos/${companyId}/${f.name}`));
  }

  // Upload new logo
  const { error: uploadError } = await supabase.storage
    .from("company-assets")
    .upload(filePath, uploadBuffer, {
      contentType: uploadContentType,
    });

  if (uploadError) {
    console.error("Logo upload error:", uploadError);
    return NextResponse.json({ error: "로고 업로드 중 오류가 발생했습니다" }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("company-assets")
    .getPublicUrl(filePath);

  const logoUrl = urlData.publicUrl;

  // Update company record
  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", companyId);

  if (updateError) {
    console.error("Logo URL update error:", updateError);
    return NextResponse.json({ error: "로고 URL 저장 중 오류가 발생했습니다" }, { status: 500 });
  }

  return NextResponse.json({ logoUrl });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  // Remove from storage
  const { data: files } = await supabase.storage
    .from("company-assets")
    .list(`logos/${companyId}`);

  if (files && files.length > 0) {
    await supabase.storage
      .from("company-assets")
      .remove(files.map((f) => `logos/${companyId}/${f.name}`));
  }

  // Clear logo_url
  await supabase
    .from("companies")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", companyId);

  return NextResponse.json({ message: "로고가 삭제되었습니다" });
}
