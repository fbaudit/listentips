import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/auth/admin-auth";
import { sendSMS } from "@/lib/utils/sms";

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to } = body;

  if (!to) {
    return NextResponse.json({ error: "수신 번호가 필요합니다" }, { status: 400 });
  }

  const success = await sendSMS({
    to,
    message: "[모두의 제보채널] 테스트 SMS입니다. SMS 설정이 정상 작동합니다.",
  });

  if (!success) {
    return NextResponse.json(
      { error: "SMS 발송에 실패했습니다. 설정을 확인해주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "테스트 SMS가 발송되었습니다" });
}
