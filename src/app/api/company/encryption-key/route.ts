import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import { generateDataKey, hashKey } from "@/lib/utils/data-encryption";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from("companies")
    .select("data_key_hash")
    .eq("id", session.user.companyId)
    .single();

  return NextResponse.json({
    encryptionEnabled: !!company?.data_key_hash,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;
  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  if (action === "generate") {
    try {
      // Check if key already exists
      const { data: company, error: selectError } = await supabase
        .from("companies")
        .select("data_key_hash")
        .eq("id", companyId)
        .single();

      if (selectError) {
        console.error("encryption-key generate: select error:", selectError.message);
        return NextResponse.json(
          { error: `기업 정보 조회 실패: ${selectError.message}` },
          { status: 500 }
        );
      }

      if (company?.data_key_hash) {
        return NextResponse.json(
          { error: "암호화 키가 이미 설정되어 있습니다. 기존 키를 재설정하려면 관리자에게 문의하세요." },
          { status: 400 }
        );
      }

      // Generate new data key
      const dataKey = generateDataKey();
      const keyHash = hashKey(dataKey);

      // Encrypt the data key with the system key (NEXTAUTH_SECRET)
      const { encrypted, iv } = encrypt(dataKey);

      // Store encrypted key in DB
      const { error: updateError } = await supabase
        .from("companies")
        .update({
          data_encryption_key: encrypted,
          data_encryption_iv: iv,
          data_key_hash: keyHash,
        })
        .eq("id", companyId);

      if (updateError) {
        console.error("encryption-key generate: update error:", updateError.message);
        return NextResponse.json(
          { error: `키 저장 실패: ${updateError.message}` },
          { status: 500 }
        );
      }

      // Return plaintext key (one-time display only)
      return NextResponse.json({
        dataKey,
        message: "암호화 키가 생성되었습니다. 이 키를 안전한 곳에 보관하세요. 다시 표시되지 않습니다.",
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("encryption-key generate: unhandled error:", errMsg);
      return NextResponse.json(
        { error: `키 생성 중 오류: ${errMsg}` },
        { status: 500 }
      );
    }
  }

  if (action === "verify") {
    const { key } = body;
    if (!key) {
      return NextResponse.json({ error: "키를 입력해주세요" }, { status: 400 });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("data_key_hash")
      .eq("id", companyId)
      .single();

    if (!company?.data_key_hash) {
      return NextResponse.json({ error: "암호화 키가 설정되지 않았습니다" }, { status: 400 });
    }

    const inputHash = hashKey(key);
    const valid = inputHash === company.data_key_hash;

    return NextResponse.json({ valid });
  }

  // action === "get-key": retrieve decrypted key from DB (server-side only, for report encryption)
  if (action === "get-key") {
    const { data: company } = await supabase
      .from("companies")
      .select("data_encryption_key, data_encryption_iv, data_key_hash")
      .eq("id", companyId)
      .single();

    if (!company?.data_encryption_key || !company?.data_encryption_iv) {
      return NextResponse.json({ dataKey: null });
    }

    try {
      const dataKey = decrypt(company.data_encryption_key, company.data_encryption_iv);
      return NextResponse.json({ dataKey });
    } catch {
      return NextResponse.json({ error: "키 복호화 실패" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
