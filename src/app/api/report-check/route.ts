import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/utils/password";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { reportNumber, password } = await request.json();

    if (!reportNumber || !password) {
      return NextResponse.json({ error: "접수번호와 비밀번호를 입력해주세요" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: report, error } = await supabase
      .from("reports")
      .select("id, report_number, password_hash, company_id")
      .eq("report_number", reportNumber.toUpperCase())
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "일치하는 제보를 찾을 수 없습니다" }, { status: 404 });
    }

    const isValid = await verifyPassword(password, report.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다" }, { status: 401 });
    }

    // Generate a temporary access token (valid for 1 hour)
    const tokenPayload = `${report.id}:${report.report_number}:${Date.now()}`;
    const token = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(tokenPayload)
      .digest("hex");

    // Increment view count (best-effort)
    const { error: rpcError } = await supabase.rpc("increment_view_count", { report_id: report.id });
    if (rpcError) {
      await supabase
        .from("reports")
        .update({ view_count: 1 })
        .eq("id", report.id);
    }

    return NextResponse.json({
      token,
      reportId: report.id,
      message: "인증되었습니다",
    });
  } catch (error) {
    console.error("Report check error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
