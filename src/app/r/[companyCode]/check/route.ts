import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyCode: string }> }
) {
  const { companyCode } = await params;
  const url = new URL(`/report/${companyCode}/check`, _request.url);
  return NextResponse.redirect(url, 301);
}
