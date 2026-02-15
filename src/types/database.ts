// Supabase Database Types
// In production, generate these with: npx supabase gen types typescript

export type UserRole = "super_admin" | "admin" | "other_admin" | "company_admin";
export type CompanyRole = "manager" | "user" | "other";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type SubscriptionPlan = "free_trial" | "monthly" | "yearly" | "premium_monthly" | "premium_yearly";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "past_due";
export type PaymentProvider = "toss" | "stripe";
export type NotificationType = "new_report" | "status_change" | "new_comment" | "subscription_expiry" | "system";
export type AuthorType = "reporter" | "company_admin" | "super_admin";

export interface CompanyGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  group_id: string | null;
  company_code: string;
  name: string;
  name_en: string | null;
  business_number: string | null;
  representative_name: string | null;
  industry: string | null;
  employee_count: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  welcome_message: string | null;
  primary_color: string;
  use_ai_validation: boolean;
  use_chatbot: boolean;
  ai_provider: string | null;
  ai_api_key_encrypted: string | null;
  ai_encryption_iv: string | null;
  data_encryption_key: string | null;
  data_encryption_iv: string | null;
  data_key_hash: string | null;
  preferred_locale: string;
  service_start: string | null;
  service_end: string | null;
  block_foreign_ip: boolean;
  allowed_countries: string[];
  ip_blocklist: string[];
  rate_limit_enabled: boolean;
  rate_limit_max_reports: number;
  rate_limit_window_minutes: number;
  min_password_length: number;
  require_special_chars: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string | null;
  email: string;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  company_role: CompanyRole;
  phone: string | null;
  mobile: string | null;
  country: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  valid_from: string | null;
  valid_to: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportType {
  id: string;
  company_id: string;
  type_name: string;
  type_name_en: string | null;
  type_name_ja: string | null;
  type_name_zh: string | null;
  code: string | null;
  description: string | null;
  notes: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DefaultReportType {
  id: string;
  type_name: string;
  type_name_en: string | null;
  type_name_ja: string | null;
  type_name_zh: string | null;
  code: string | null;
  description: string | null;
  notes: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DefaultReportStatus {
  id: string;
  status_name: string;
  status_name_en: string | null;
  status_name_ja: string | null;
  status_name_zh: string | null;
  color_code: string;
  display_order: number;
  is_default: boolean;
  is_terminal: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ReportStatus {
  id: string;
  company_id: string;
  status_name: string;
  status_name_en: string | null;
  status_name_ja: string | null;
  status_name_zh: string | null;
  color_code: string;
  display_order: number;
  is_default: boolean;
  is_terminal: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  company_id: string;
  report_type_id: string | null;
  status_id: string | null;
  report_number: string;
  password_hash: string;
  title: string;
  content: string;
  who_field: string | null;
  what_field: string | null;
  when_field: string | null;
  where_field: string | null;
  why_field: string | null;
  how_field: string | null;
  ai_validation_score: number | null;
  ai_validation_feedback: Record<string, unknown> | null;
  reporter_ip_hash: string | null;
  reporter_locale: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReportAttachment {
  id: string;
  report_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Comment {
  id: string;
  report_id: string;
  author_type: AuthorType;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface ReportEditHistory {
  id: string;
  report_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_by: string;
  edited_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  payment_provider: PaymentProvider | null;
  external_subscription_id: string | null;
  amount: number | null;
  currency: string;
  start_date: string;
  end_date: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  company_id: string | null;
  user_id: string | null;
  type: NotificationType;
  channel: string;
  title: string;
  message: string;
  link: string | null;
  recipient: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
  status: string;
  created_at: string;
}

export interface Application {
  id: string;
  company_name: string;
  business_number: string | null;
  industry: string | null;
  employee_count: number | null;
  address: string | null;
  department: string | null;
  channel_name: string | null;
  report_types: string[];
  welcome_message: string | null;
  report_guide_message: string | null;
  content_blocks: Array<{ id: string; content: string; order: number }> | null;
  display_fields: string[] | null;
  preferred_locale: string;
  use_ai_validation: boolean;
  use_chatbot: boolean;
  admin_name: string;
  admin_email: string;
  admin_phone: string | null;
  admin_username: string;
  admin_password_hash: string;
  logo_url: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  title: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  content_text: string | null;
  is_active: boolean;
  gemini_file_uri: string | null;
  gemini_file_name: string | null;
  gemini_uploaded_at: string | null;
  created_at: string;
}
