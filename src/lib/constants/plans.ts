export const PLANS = {
  free_trial: {
    id: "free_trial" as const,
    name: { ko: "무료 체험", en: "Free Trial", ja: "無料トライアル", zh: "免费试用" },
    duration: 30,
    price: { KRW: 0, USD: 0, JPY: 0, CNY: 0 },
    features: {
      ko: ["최대 30건 제보 접수", "기본 통계", "이메일 알림"],
      en: ["Up to 50 reports", "Basic statistics", "Email notifications"],
      ja: ["最大50件の通報", "基本統計", "メール通知"],
      zh: ["最多50个举报", "基本统计", "邮件通知"],
    },
  },
  monthly: {
    id: "monthly" as const,
    name: { ko: "월간 구독", en: "Monthly", ja: "月額プラン", zh: "月度订阅" },
    duration: 30,
    price: { KRW: 200000, USD: 150, JPY: 20000, CNY: 1000 },
    features: {
      ko: ["무제한 제보 접수", "AI 콘텐츠 검증", "고급 통계 대시보드"],
      en: ["Unlimited reports", "AI content validation", "Advanced dashboard"],
      ja: ["無制限の通報", "AIコンテンツ検証", "高度なダッシュボード"],
      zh: ["无限举报", "AI内容验证", "高级统计仪表盘"],
    },
  },
  yearly: {
    id: "yearly" as const,
    name: { ko: "연간 구독", en: "Yearly", ja: "年額プラン", zh: "年度订阅" },
    duration: 365,
    price: { KRW: 2000000, USD: 1500, JPY: 200000, CNY: 10000 },
    features: {
      ko: ["월간 구독의 모든 기능", "2개월 할인 효과" ],
      en: ["All monthly features", "2 months free"],
      ja: ["月額プランの全機能", "2ヶ月分お得"],
      zh: ["所有月度功能", "节省2个月费用"],
    },
  },
  premium_monthly: {
    id: "premium_monthly" as const,
    name: { ko: "프리미엄 월간", en: "Premium Monthly", ja: "プレミアム月額", zh: "高级月度" },
    duration: 30,
    price: { KRW: 300000, USD: 230, JPY: 30000, CNY: 1500 },
    features: {
      ko: ["무제한 제보 접수", "AI 콘텐츠 검증", "고급 통계 대시보드",  "제보관리 대행", "조사 자문"],
      en: ["Unlimited reports", "AI content validation", "Advanced dashboard",  "Report management service", "Investigation consulting"],
      ja: ["無制限の通報", "AIコンテンツ検証", "高度なダッシュボード",  "通報管理代行", "調査コンサルティング"],
      zh: ["无限举报", "AI内容验证", "高级统计仪表盘",  "举报管理代理", "调查咨询"],
    },
  },
  premium_yearly: {
    id: "premium_yearly" as const,
    name: { ko: "프리미엄 연간", en: "Premium Yearly", ja: "プレミアム年額", zh: "高级年度" },
    duration: 365,
    price: { KRW: 3000000, USD: 2300, JPY: 300000, CNY: 15000 },
    features: {
      ko: ["프리미엄 월간의 모든 기능", "2개월 할인 효과"],
      en: ["All Premium Monthly features", "2 months free"],
      ja: ["プレミアム月額の全機能", "2ヶ月分お得", ],
      zh: ["所有高级月度功能", "节省2个月费用", ],
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;
