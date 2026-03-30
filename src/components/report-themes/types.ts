export type ChannelTheme = "minimal" | "warm" | "dark-elegant" | "futuristic" | "vibrant";

export interface ContentBlock {
  id: string;
  content: string;
  order: number;
}

export type CardId = "submit" | "check" | "content";

export const DEFAULT_CARD_ORDER: CardId[] = ["submit", "check", "content"];

export interface ChannelThemeProps {
  channelName: string;
  welcomeMessage: string;
  logoUrl: string | null;
  primaryColor: string;
  companyCode: string;
  contentBlocks: ContentBlock[];
  cardOrder: CardId[];
  useChatbot: boolean;
  t: (key: string) => string;
}

export const THEME_OPTIONS: { value: ChannelTheme; label: string; description: string }[] = [
  { value: "minimal", label: "미니멀 클린", description: "화이트 톤, 넓은 여백의 깔끔한 디자인" },
  { value: "warm", label: "소프트 케어", description: "차분한 블루그레이, 안심감을 주는 디자인" },
  { value: "dark-elegant", label: "다크 프로페셔널", description: "다크 네이비 배경의 격조 있는 디자인" },
  { value: "futuristic", label: "시큐어 테크", description: "다크 배경 + 그린 보안 악센트 디자인" },
  { value: "vibrant", label: "트러스트 블루", description: "딥블루 그라디언트, 전문기관 느낌의 디자인" },
];

/** Generate rgba string from hex + alpha */
export function colorWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
