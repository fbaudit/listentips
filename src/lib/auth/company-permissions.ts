import type { CompanyRole } from "@/types/database";

export const COMPANY_MENU_KEYS = ["dashboard", "reports", "settings", "subscription"] as const;
export type CompanyMenuKey = (typeof COMPANY_MENU_KEYS)[number];

export const COMPANY_ROLE_PERMISSIONS: Record<CompanyRole, CompanyMenuKey[]> = {
  manager: ["dashboard", "reports", "settings", "subscription"],
  user: ["dashboard", "reports"],
  other: ["dashboard"],
};

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  manager: "관리자",
  user: "일반사용자",
  other: "기타",
};

export function getCompanyMenuPermissions(role: CompanyRole | null | undefined): CompanyMenuKey[] {
  if (!role || !(role in COMPANY_ROLE_PERMISSIONS)) {
    return ["dashboard"];
  }
  return COMPANY_ROLE_PERMISSIONS[role];
}

export function getCompanyMenuKeyFromPath(pathname: string): string | null {
  const match = pathname.match(/\/company\/([^/]+)/);
  return match ? match[1] : null;
}
