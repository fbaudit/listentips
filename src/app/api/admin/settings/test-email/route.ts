import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/auth/admin-auth";
import { sendEmail } from "@/lib/utils/email";

export async function POST(request: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to } = body;

  if (!to) {
    return NextResponse.json({ error: "수신자 이메일이 필요합니다" }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: "[모두의 제보채널 Listen] 테스트 이메일",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>테스트 이메일</h2>
        <p>이 이메일은 모두의 제보채널 Listen 플랫폼 설정에서 발송된 테스트 이메일입니다.</p>
        <p>이메일 설정이 정상적으로 작동합니다.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">모두의 제보채널 Listen</p>
      </div>
    `,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "이메일 발송에 실패했습니다. 설정을 확인해주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "테스트 이메일이 발송되었습니다" });
}
