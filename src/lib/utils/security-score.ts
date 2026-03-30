/**
 * 기업의 보안 설정 점수를 계산한다 (0~100).
 * 관리자 대시보드에 표시되며, 설정 개선을 유도한다.
 */

interface CompanySecurityFields {
  // 기본 설정
  logo_url: string | null;
  channel_name: string | null;
  welcome_message: string | null;
  // 보안 설정
  two_factor_enabled: boolean;
  min_password_length: number;
  require_special_chars: boolean;
  rate_limit_enabled: boolean;
  block_foreign_ip: boolean;
  // 암호화
  data_encryption_key: string | null;
  // AI
  use_ai_validation: boolean;
  // 기타
  data_retention_months: number | null;
}

interface ScoreItem {
  category: string;
  label: string;
  points: number;
  achieved: boolean;
  tip: string;
}

export interface SecurityScoreResult {
  score: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  items: ScoreItem[];
}

export function calculateSecurityScore(company: CompanySecurityFields): SecurityScoreResult {
  const items: ScoreItem[] = [
    // 인증 (30점)
    {
      category: "인증",
      label: "2단계 인증(2FA) 활성화",
      points: 15,
      achieved: company.two_factor_enabled === true,
      tip: "설정 > 보안 > 2단계 인증을 활성화하세요",
    },
    {
      category: "인증",
      label: "비밀번호 최소 길이 10자 이상",
      points: 10,
      achieved: company.min_password_length >= 10,
      tip: "설정 > 보안 > 최소 비밀번호 길이를 10자 이상으로 설정하세요",
    },
    {
      category: "인증",
      label: "특수문자 필수 요구",
      points: 5,
      achieved: company.require_special_chars === true,
      tip: "설정 > 보안 > 특수문자 필수를 활성화하세요",
    },
    // 데이터 보호 (30점)
    {
      category: "데이터 보호",
      label: "데이터 암호화 활성화",
      points: 20,
      achieved: !!company.data_encryption_key,
      tip: "설정 > 기타 > 데이터 암호화 키를 생성하세요",
    },
    {
      category: "데이터 보호",
      label: "데이터 보존 기간 설정",
      points: 10,
      achieved: (company.data_retention_months || 0) > 0,
      tip: "데이터 보존 기간을 설정하여 자동 파기 정책을 운영하세요",
    },
    // 접근 제어 (20점)
    {
      category: "접근 제어",
      label: "접수 빈도 제한 활성화",
      points: 10,
      achieved: company.rate_limit_enabled === true,
      tip: "설정 > 보안 > 접수 빈도 제한을 활성화하세요",
    },
    {
      category: "접근 제어",
      label: "해외 IP 차단 활성화",
      points: 10,
      achieved: company.block_foreign_ip === true,
      tip: "설정 > 보안 > 해외 IP 차단을 활성화하세요",
    },
    // AI 보안 (10점)
    {
      category: "AI",
      label: "AI 제보 검증 활성화",
      points: 10,
      achieved: company.use_ai_validation === true,
      tip: "설정 > 채널 > AI 검증을 활성화하면 허위 제보를 필터링할 수 있습니다",
    },
    // 채널 설정 (10점)
    {
      category: "채널",
      label: "로고 설정",
      points: 5,
      achieved: !!company.logo_url,
      tip: "회사 로고를 등록하면 제보 채널의 신뢰도가 높아집니다",
    },
    {
      category: "채널",
      label: "안내 메시지 설정",
      points: 5,
      achieved: !!company.welcome_message && company.welcome_message.length > 10,
      tip: "제보 채널에 안내 메시지를 설정하세요",
    },
  ];

  const score = items.filter((i) => i.achieved).reduce((sum, i) => sum + i.points, 0);
  const maxScore = items.reduce((sum, i) => sum + i.points, 0);

  let grade: SecurityScoreResult["grade"] = "F";
  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return { score, maxScore, grade, items };
}
