export const ROUTES = {
  // Public
  HOME: "/",
  APPLY: "/apply",
  PRICING: "/pricing",
  FEATURES: "/features",
  TERMS: "/terms",
  PRIVACY: "/privacy",

  // Report Channel
  REPORT: (companyCode: string) => `/report/${companyCode}`,
  REPORT_SUBMIT: (companyCode: string) => `/report/${companyCode}/submit`,
  REPORT_CHECK: (companyCode: string) => `/report/${companyCode}/check`,
  REPORT_DETAIL: (companyCode: string, reportNo: string) =>
    `/report/${companyCode}/check/${reportNo}`,

  // Company Admin
  COMPANY_LOGIN: "/company/login",
  COMPANY_DASHBOARD: "/company/dashboard",
  COMPANY_REPORTS: "/company/reports",
  COMPANY_REPORT_DETAIL: (id: string) => `/company/reports/${id}`,
  COMPANY_SETTINGS: "/company/settings",
  COMPANY_SUBSCRIPTION: "/company/subscription",

  // Super Admin
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_COMPANIES: "/admin/companies",
  ADMIN_COMPANY_DETAIL: (id: string) => `/admin/companies/${id}`,
  ADMIN_CODES: "/admin/codes",
  ADMIN_SUBSCRIPTIONS: "/admin/subscriptions",
  ADMIN_APPLICATIONS: "/admin/applications",
  ADMIN_APPLICATION_DETAIL: (id: string) => `/admin/applications/${id}`,
} as const;
