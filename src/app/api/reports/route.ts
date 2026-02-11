import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/utils/password";
import { generateCode } from "@/lib/utils/generate-code";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "";
  const summary = searchParams.get("summary") === "true";
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from("reports")
    .select(
      "id, report_number, title, created_at, report_types(type_name), report_statuses(status_name, color_code)",
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`report_number.ilike.%${search}%,title.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json({ error: "제보 조회 오류" }, { status: 500 });
  }

  // Map to expected format
  const reports = (data || []).map((r: Record<string, unknown>) => {
    const reportType = r.report_types as { type_name: string } | null;
    const reportStatus = r.report_statuses as { status_name: string; color_code: string } | null;
    return {
      id: r.id,
      report_number: r.report_number,
      title: r.title,
      created_at: r.created_at,
      status: reportStatus ? { name: reportStatus.status_name, color: reportStatus.color_code } : null,
      report_type: reportType ? { name: reportType.type_name } : null,
    };
  });

  // Filter by status name if provided (post-query filter since status is a joined table)
  const filteredReports = statusFilter
    ? reports.filter((r: { status: { name: string } | null }) => r.status?.name === statusFilter)
    : reports;

  if (summary) {
    // Get all reports count by status for dashboard
    const { data: allReports } = await supabase
      .from("reports")
      .select("id, report_statuses(status_name, is_default, is_terminal)")
      .eq("company_id", companyId);

    let pendingCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    (allReports || []).forEach((r: Record<string, unknown>) => {
      const st = r.report_statuses as { status_name: string; is_default: boolean; is_terminal: boolean } | null;
      if (!st) {
        pendingCount++;
      } else if (st.is_terminal) {
        resolvedCount++;
      } else if (st.is_default) {
        pendingCount++;
      } else {
        inProgressCount++;
      }
    });

    return NextResponse.json({
      total: count || 0,
      pendingCount,
      inProgressCount,
      resolvedCount,
      reports: filteredReports,
    });
  }

  return NextResponse.json({
    reports: filteredReports,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const companyId = formData.get("companyId") as string;
    const reportTypeId = formData.get("reportTypeId") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const password = formData.get("password") as string;
    const aiValidationScore = formData.get("aiValidationScore") as string;
    const aiValidationFeedback = formData.get("aiValidationFeedback") as string;

    if (!companyId || !reportTypeId || !title || !content || !password) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요" }, { status: 400 });
    }

    if (title.length < 5 || content.length < 20) {
      return NextResponse.json({ error: "제목 또는 내용이 너무 짧습니다" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 최소 8자리입니다" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify company exists and is active
    const { data: company } = await supabase
      .from("companies")
      .select("id, is_active")
      .eq("id", companyId)
      .eq("is_active", true)
      .single();

    if (!company) {
      return NextResponse.json({ error: "유효하지 않은 기업입니다" }, { status: 404 });
    }

    // Get default status
    const { data: defaultStatus } = await supabase
      .from("report_statuses")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_default", true)
      .single();

    // Generate unique report number
    let reportNumber: string;
    let isUnique = false;
    do {
      reportNumber = generateCode(8);
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("report_number", reportNumber)
        .single();
      isUnique = !existing;
    } while (!isUnique);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Hash IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

    // Get locale from header
    const locale = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] || "ko";

    // Insert report
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        company_id: companyId,
        report_type_id: reportTypeId,
        status_id: defaultStatus?.id || null,
        report_number: reportNumber,
        password_hash: passwordHash,
        title,
        content,
        ai_validation_score: aiValidationScore ? parseFloat(aiValidationScore) : null,
        ai_validation_feedback: aiValidationFeedback ? JSON.parse(aiValidationFeedback) : null,
        reporter_ip_hash: ipHash,
        reporter_locale: locale,
      })
      .select("id, report_number")
      .single();

    if (insertError) {
      console.error("Report insert error:", insertError);
      return NextResponse.json({ error: "제보 접수 중 오류가 발생했습니다" }, { status: 500 });
    }

    // Handle file uploads
    const files = formData.getAll("files") as File[];
    if (files.length > 0) {
      for (const file of files) {
        if (file.size === 0) continue;

        const ext = file.name.split(".").pop();
        const filePath = `reports/${report.id}/${generateCode(16)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("report-attachments")
          .upload(filePath, file, {
            contentType: file.type,
          });

        if (!uploadError) {
          await supabase.from("report_attachments").insert({
            report_id: report.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          });
        }
      }
    }

    // TODO: Send notification to company admins

    return NextResponse.json({
      reportNumber: report.report_number,
      message: "제보가 접수되었습니다",
    });
  } catch (error) {
    console.error("Report creation error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
