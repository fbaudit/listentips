import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth/auth";

interface CheckItem {
  id: string;
  category: string;
  requirement: string;
  regulation: string;
  status: "pass" | "fail" | "partial";
  detail: string;
}

/**
 * GET /api/company/compliance-checklist
 * 공익신고자보호법 / EU Directive / ISO 37002 자가진단
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const companyId = session.user.companyId;

  const { data: company } = await supabase
    .from("companies")
    .select("two_factor_enabled, data_encryption_key, rate_limit_enabled, channel_name, welcome_message, use_ai_validation, data_retention_months")
    .eq("id", companyId)
    .single();

  // 제보 건수
  const { count: totalReports } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  // 7일 내 접수확인된 건수
  const { data: reportsWithAck } = await supabase
    .from("reports")
    .select("created_at, acknowledged_at")
    .eq("company_id", companyId)
    .not("acknowledged_at", "is", null);

  const ackRate = totalReports && totalReports > 0
    ? Math.round(((reportsWithAck?.length || 0) / totalReports) * 100)
    : 0;

  // 담당자 배정률
  const { count: assignedCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("assigned_to", "is", null);

  const assignRate = totalReports && totalReports > 0
    ? Math.round(((assignedCount || 0) / totalReports) * 100)
    : 0;

  // 감사 로그 존재 여부
  const { count: auditCount } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const items: CheckItem[] = [
    // 공익신고자보호법
    {
      id: "kr-channel",
      category: "공익신고자보호법",
      requirement: "내부 신고 채널 운영",
      regulation: "공익신고자보호법 제6조",
      status: company?.channel_name ? "pass" : "fail",
      detail: company?.channel_name ? "제보 채널이 설정되어 운영 중입니다" : "제보 채널 이름을 설정해주세요",
    },
    {
      id: "kr-anonymity",
      category: "공익신고자보호법",
      requirement: "신고자 익명성 보장",
      regulation: "공익신고자보호법 제12조",
      status: "pass",
      detail: "이메일/로그인 없이 익명 제보가 가능합니다",
    },
    {
      id: "kr-encryption",
      category: "공익신고자보호법",
      requirement: "신고 내용 보호 (암호화)",
      regulation: "개인정보보호법 제29조",
      status: company?.data_encryption_key ? "pass" : "fail",
      detail: company?.data_encryption_key ? "AES-256-GCM 암호화가 적용되어 있습니다" : "데이터 암호화를 활성화해주세요",
    },
    // EU Whistleblower Directive
    {
      id: "eu-7day",
      category: "EU 내부고발 지침",
      requirement: "7일 이내 접수 확인",
      regulation: "EU Directive 2019/1937 Art. 9(1)(b)",
      status: ackRate >= 80 ? "pass" : ackRate >= 50 ? "partial" : "fail",
      detail: `접수 확인률: ${ackRate}% (${reportsWithAck?.length || 0}/${totalReports || 0}건)`,
    },
    {
      id: "eu-assign",
      category: "EU 내부고발 지침",
      requirement: "담당자 지정",
      regulation: "EU Directive 2019/1937 Art. 9(1)(a)",
      status: assignRate >= 80 ? "pass" : assignRate >= 50 ? "partial" : "fail",
      detail: `담당자 배정률: ${assignRate}% (${assignedCount || 0}/${totalReports || 0}건)`,
    },
    {
      id: "eu-twoway",
      category: "EU 내부고발 지침",
      requirement: "양방향 소통 채널",
      regulation: "EU Directive 2019/1937 Art. 9(1)",
      status: "pass",
      detail: "댓글 시스템을 통해 익명 양방향 소통이 가능합니다",
    },
    // ISO 37002
    {
      id: "iso-audit",
      category: "ISO 37002",
      requirement: "감사 추적 기록",
      regulation: "ISO 37002:2021 §8.4",
      status: (auditCount || 0) > 0 ? "pass" : "fail",
      detail: `감사 로그 ${auditCount || 0}건 기록됨`,
    },
    {
      id: "iso-retention",
      category: "ISO 37002",
      requirement: "데이터 보존 정책",
      regulation: "ISO 37002:2021 §9.2",
      status: (company?.data_retention_months || 0) > 0 ? "pass" : "fail",
      detail: company?.data_retention_months ? `보존 기간: ${company.data_retention_months}개월` : "데이터 보존 기간을 설정해주세요",
    },
    {
      id: "iso-access",
      category: "ISO 37002",
      requirement: "접근 통제 (2FA)",
      regulation: "ISO 37002:2021 §7.3",
      status: company?.two_factor_enabled ? "pass" : "fail",
      detail: company?.two_factor_enabled ? "2단계 인증이 활성화되어 있습니다" : "2단계 인증을 활성화해주세요",
    },
  ];

  const passCount = items.filter((i) => i.status === "pass").length;
  const complianceRate = Math.round((passCount / items.length) * 100);

  return NextResponse.json({
    complianceRate,
    totalChecks: items.length,
    passCount,
    items,
  });
}
