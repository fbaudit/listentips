import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";
import { getCompanyDataKey, decryptWithKey, isEncrypted } from "@/lib/utils/data-encryption";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportIds } = await request.json();
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return NextResponse.json({ error: "제보를 선택해주세요" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  const { data: reports, error } = await supabase
    .from("reports")
    .select(`
      id, report_number, title, content, created_at, updated_at,
      ai_validation_score, view_count, reporter_locale,
      report_types(type_name),
      report_statuses(status_name),
      attachments:report_attachments(file_name)
    `)
    .eq("company_id", companyId)
    .in("id", reportIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "제보 조회 오류" }, { status: 500 });
  }

  // Decrypt if encryption key provided
  const encKey = request.headers.get("x-encryption-key") || null;
  const dataKey = encKey || await getCompanyDataKey(companyId);

  const exportData = (reports || []).map((r) => {
    const rtRaw = r.report_types as unknown;
    const rt = (Array.isArray(rtRaw) ? rtRaw[0] : rtRaw) as { type_name: string } | null;
    const stRaw = r.report_statuses as unknown;
    const st = (Array.isArray(stRaw) ? stRaw[0] : stRaw) as { status_name: string } | null;
    const attachments = (r.attachments || []) as { file_name: string }[];

    let title = r.title as string;
    let content = r.content as string;

    if (dataKey) {
      if (isEncrypted(title)) {
        try { title = decryptWithKey(title, dataKey); } catch { title = "[복호화 실패]"; }
      }
      if (isEncrypted(content)) {
        try { content = decryptWithKey(content, dataKey); } catch { content = "[복호화 실패]"; }
      }
    } else {
      if (isEncrypted(title)) title = "[암호화됨]";
      if (isEncrypted(content)) content = "[암호화됨]";
    }

    return {
      report_number: r.report_number,
      title,
      content,
      report_type: rt?.type_name || "",
      status: st?.status_name || "",
      ai_validation_score: r.ai_validation_score != null ? Math.round((r.ai_validation_score as number) * 100) : "",
      view_count: r.view_count,
      reporter_locale: r.reporter_locale || "",
      attachments: attachments.map((a) => a.file_name).join(", "),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  return NextResponse.json({ reports: exportData });
}
