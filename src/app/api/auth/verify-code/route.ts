import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/utils/verification-code";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, code } = body;

  if (!userId || !code) {
    return NextResponse.json(
      { error: "인증번호를 입력해주세요" },
      { status: 400 }
    );
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "인증번호는 6자리 숫자입니다" },
      { status: 400 }
    );
  }

  // Only validate — don't mark as used yet.
  // The code will be consumed (marked used) by NextAuth's authorize().
  const valid = await verifyCode(userId, code, false);

  if (!valid) {
    return NextResponse.json(
      { error: "인증번호가 올바르지 않거나 만료되었습니다" },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
