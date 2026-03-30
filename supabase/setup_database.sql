-- ============================================================
-- ListenTips 전체 데이터베이스 설정 SQL
-- 새 Supabase 프로젝트에서 한번에 실행하세요
-- 생성일: 2026-03-30
-- ============================================================

-- ============================================================
-- 1. ENUM 타입 생성
-- ============================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'admin', 'other_admin');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE subscription_plan AS ENUM ('free_trial', 'monthly', 'yearly', 'premium_monthly', 'premium_yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'past_due');
CREATE TYPE payment_provider AS ENUM ('toss', 'stripe');
CREATE TYPE notification_type AS ENUM ('new_report', 'status_change', 'new_comment', 'subscription_expiry', 'system', 'report_modified');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'both');
CREATE TYPE author_type AS ENUM ('reporter', 'company_admin', 'super_admin');


-- ============================================================
-- 2. 테이블 생성
-- ============================================================

-- ── company_groups ──
CREATE TABLE company_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── companies ──
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL,
  company_code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  business_number VARCHAR(20),
  representative_name VARCHAR(100),
  industry VARCHAR(100),
  employee_count INTEGER,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  logo_url VARCHAR(500),
  description TEXT,
  welcome_message TEXT,
  primary_color VARCHAR(7) DEFAULT '#1a1a2e',
  use_ai_validation BOOLEAN NOT NULL DEFAULT false,
  use_chatbot BOOLEAN NOT NULL DEFAULT false,
  preferred_locale VARCHAR(5) DEFAULT 'ko',
  service_start TIMESTAMPTZ,
  service_end TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- channel settings (00020~00022)
  channel_name VARCHAR(200) DEFAULT '익명 제보 채널',
  report_guide_message TEXT,
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- AI provider config (00025)
  ai_provider VARCHAR(20),
  ai_api_key_encrypted TEXT,
  ai_encryption_iv TEXT,
  -- data encryption (00028)
  data_encryption_key TEXT,
  data_encryption_iv TEXT,
  data_key_hash TEXT,
  -- security settings (00030)
  block_foreign_ip BOOLEAN NOT NULL DEFAULT false,
  allowed_countries TEXT[] NOT NULL DEFAULT ARRAY['KR'],
  ip_blocklist TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rate_limit_enabled BOOLEAN NOT NULL DEFAULT false,
  rate_limit_max_reports INTEGER NOT NULL DEFAULT 5,
  rate_limit_window_minutes INTEGER NOT NULL DEFAULT 60,
  min_password_length INTEGER NOT NULL DEFAULT 8,
  require_special_chars BOOLEAN NOT NULL DEFAULT false,
  -- 2FA (00039)
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  -- submission success messages (00041)
  submission_success_title TEXT,
  submission_success_message TEXT,
  -- channel theme (00101)
  channel_theme VARCHAR(30) DEFAULT 'minimal',
  -- channel card order (00102)
  channel_card_order JSONB DEFAULT '["submit", "check", "content"]',
  -- data retention (00103)
  data_retention_months INTEGER DEFAULT 36,
  auto_purge_enabled BOOLEAN DEFAULT FALSE,
  -- trust features (00104)
  security_score INTEGER DEFAULT 0,
  compliance_checklist JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_code ON companies(company_code);
CREATE INDEX idx_companies_group ON companies(group_id);
CREATE INDEX idx_companies_active ON companies(is_active);

-- ── users ──
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'company_admin',
  phone VARCHAR(20),
  mobile VARCHAR(20),
  country VARCHAR(50) DEFAULT 'KR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret VARCHAR(255),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  -- company_role (00040)
  company_role VARCHAR(20) NOT NULL DEFAULT 'manager',
  -- password_changed_at (00100)
  password_changed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company_role ON users(company_role) WHERE role = 'company_admin';

-- ── report_types ──
CREATE TABLE report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type_name VARCHAR(200) NOT NULL,
  type_name_en VARCHAR(200),
  type_name_ja VARCHAR(200),
  type_name_zh VARCHAR(200),
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- code & notes (00027)
  code VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_types_company ON report_types(company_id);

-- ── report_statuses ──
CREATE TABLE report_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status_name VARCHAR(100) NOT NULL,
  status_name_en VARCHAR(100),
  status_name_ja VARCHAR(100),
  status_name_zh VARCHAR(100),
  color_code VARCHAR(7) NOT NULL DEFAULT '#6b7280',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_statuses_company ON report_statuses(company_id);

-- ── reports ──
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_type_id UUID REFERENCES report_types(id) ON DELETE SET NULL,
  status_id UUID REFERENCES report_statuses(id) ON DELETE SET NULL,
  report_number VARCHAR(8) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  who_field TEXT,
  what_field TEXT,
  when_field TEXT,
  where_field TEXT,
  why_field TEXT,
  how_field TEXT,
  ai_validation_score DECIMAL(3,2),
  ai_validation_feedback JSONB,
  reporter_ip_hash VARCHAR(64),
  reporter_locale VARCHAR(5),
  view_count INTEGER NOT NULL DEFAULT 0,
  -- de-identified content (00044)
  deidentified_data JSONB DEFAULT NULL,
  -- AI analysis results (00045)
  ai_analysis_results JSONB DEFAULT NULL,
  -- device type (00046)
  device_type TEXT DEFAULT NULL,
  -- SLA (00103)
  acknowledged_at TIMESTAMPTZ,
  feedback_at TIMESTAMPTZ,
  sla_acknowledged BOOLEAN DEFAULT FALSE,
  sla_feedback BOOLEAN DEFAULT FALSE,
  -- AI auto-classification (00103)
  ai_category VARCHAR(100),
  ai_urgency VARCHAR(20),
  ai_classification JSONB,
  -- workflow assignment (00103)
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  investigation_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  -- satisfaction (00103)
  satisfaction_rating INTEGER,
  satisfaction_comment TEXT,
  satisfaction_at TIMESTAMPTZ,
  -- integrity hash (00104)
  integrity_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for assigned_to after users table exists
ALTER TABLE reports ADD CONSTRAINT fk_reports_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id);

CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_reports_number ON reports(report_number);
CREATE INDEX idx_reports_status ON reports(status_id);
CREATE INDEX idx_reports_type ON reports(report_type_id);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_rate_limit ON reports(company_id, reporter_ip_hash, created_at DESC);

-- ── report_attachments ──
CREATE TABLE report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  -- voice recording (00103)
  is_voice_recording BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_attachments_report ON report_attachments(report_id);

-- ── comments ──
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_type author_type NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_report ON comments(report_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- ── comment_attachments ──
CREATE TABLE comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comment_attachments_comment ON comment_attachments(comment_id);

-- ── report_edit_history ──
CREATE TABLE report_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by VARCHAR(50) DEFAULT 'reporter',
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_edit_history_report ON report_edit_history(report_id);

-- ── subscriptions ──
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_type subscription_plan NOT NULL DEFAULT 'free_trial',
  status subscription_status NOT NULL DEFAULT 'active',
  payment_provider payment_provider,
  external_subscription_id VARCHAR(255),
  amount INTEGER,
  currency VARCHAR(3) DEFAULT 'KRW',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ── notifications ──
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'both',
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  recipient VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ── applications ──
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  business_number VARCHAR(20),
  industry VARCHAR(100),
  employee_count INTEGER,
  address TEXT,
  department VARCHAR(100),
  report_types TEXT[],
  welcome_message TEXT,
  display_fields TEXT[],
  preferred_locale VARCHAR(5) DEFAULT 'ko',
  use_ai_validation BOOLEAN NOT NULL DEFAULT false,
  use_chatbot BOOLEAN NOT NULL DEFAULT false,
  admin_name VARCHAR(100) NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  admin_phone VARCHAR(20),
  admin_username VARCHAR(100) NOT NULL,
  admin_password_hash VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  status application_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  -- channel settings (00036)
  channel_name VARCHAR(200),
  report_guide_message TEXT,
  content_blocks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(admin_email);

-- ── company_documents ──
CREATE TABLE company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  content_text TEXT,
  -- title & active (00031)
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Gemini File API (00032)
  gemini_file_uri TEXT,
  gemini_file_name TEXT,
  gemini_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_documents_company ON company_documents(company_id);

-- ── user_notification_preferences (00019) ──
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

CREATE INDEX idx_user_notif_prefs_user ON user_notification_preferences(user_id);

-- ── login_attempts (00023) ──
CREATE TABLE login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  ip_hash TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_login_attempts_username ON login_attempts(username, attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_hash, attempted_at);

-- ── platform_settings (00024) ──
CREATE TABLE platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── default_report_types (00027 + 00034) ──
CREATE TABLE default_report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name VARCHAR(200) NOT NULL,
  type_name_en VARCHAR(200),
  type_name_ja VARCHAR(200),
  type_name_zh VARCHAR(200),
  code VARCHAR(50),
  description TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── default_report_statuses (00033) ──
CREATE TABLE default_report_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_name VARCHAR(100) NOT NULL,
  status_name_en VARCHAR(100),
  status_name_ja VARCHAR(100),
  status_name_zh VARCHAR(100),
  color_code VARCHAR(7) NOT NULL DEFAULT '#6b7280',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── default_content_blocks (00035) ──
CREATE TABLE default_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── verification_codes (00028) ──
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'login_2fa',
  sent_via VARCHAR(20),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_codes_user ON verification_codes(user_id, type, expires_at);
CREATE INDEX idx_verification_codes_cleanup ON verification_codes(expires_at) WHERE used = false;

-- ── reporter_access_logs (00029) ──
CREATE TABLE reporter_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT
);

CREATE INDEX idx_reporter_access_logs_report_id ON reporter_access_logs(report_id);
CREATE INDEX idx_reporter_access_logs_accessed_at ON reporter_access_logs(accessed_at DESC);

-- ── audit_logs (00043) ──
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(200),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(200),
  changes JSONB,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ── company_ai_prompts (00047) ──
CREATE TABLE company_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, prompt_type)
);

COMMENT ON TABLE company_ai_prompts IS 'Company-specific AI prompt templates that override defaults';
COMMENT ON COLUMN company_ai_prompts.prompt_type IS 'Type: deidentification, summary, violation, investigation_plan, questionnaire, investigation_report, auto_reply';
COMMENT ON COLUMN company_ai_prompts.prompt_template IS 'Custom prompt template with {placeholders}';

-- ── report_timeline (00103) ──
CREATE TABLE report_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_label TEXT NOT NULL,
  actor_type VARCHAR(20) DEFAULT 'system',
  actor_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_timeline_report_id ON report_timeline(report_id);

-- ── company_webhooks (00103) ──
CREATE TABLE company_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  provider VARCHAR(20) DEFAULT 'custom',
  events TEXT[] DEFAULT ARRAY['new_report'],
  is_active BOOLEAN DEFAULT TRUE,
  secret_key VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_company_webhooks_company ON company_webhooks(company_id);

-- ── report_drafts (00103) ──
CREATE TABLE report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  draft_token VARCHAR(64) NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  report_type_id UUID,
  form_data JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_drafts_token ON report_drafts(draft_token);
CREATE INDEX idx_report_drafts_expires ON report_drafts(expires_at);


-- ============================================================
-- 3. Row Level Security (RLS)
-- ============================================================
ALTER TABLE company_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_drafts ENABLE ROW LEVEL SECURITY;

-- Public read for active companies (report channel needs this)
CREATE POLICY "public_company_read" ON companies
  FOR SELECT USING (is_active = true);

-- Public read for active report types
CREATE POLICY "public_report_types_read" ON report_types
  FOR SELECT USING (is_active = true);

-- Public read for report statuses
CREATE POLICY "public_report_statuses_read" ON report_statuses
  FOR SELECT USING (true);

-- Public insert for applications
CREATE POLICY "public_application_insert" ON applications
  FOR INSERT WITH CHECK (true);

-- Company AI prompts access
CREATE POLICY "company_ai_prompts_company_access" ON company_ai_prompts
  FOR ALL USING (true);


-- ============================================================
-- 4. 함수 및 트리거
-- ============================================================

-- Generate unique 8-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_unique_code(table_name TEXT, column_name TEXT)
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(8) := '';
  i INTEGER;
  exists_flag BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I = $1)', table_name, column_name)
    INTO exists_flag USING result;

    IF NOT exists_flag THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Auto-create default report types, statuses, and content blocks for new company
-- (최종 버전: 00035에서 정의)
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
DECLARE
  blocks JSONB;
BEGIN
  -- Insert from default_report_types table
  INSERT INTO report_types (company_id, type_name, type_name_en, type_name_ja, type_name_zh, code, description, notes, display_order)
  SELECT NEW.id, type_name, type_name_en, type_name_ja, type_name_zh, code, description, notes, display_order
  FROM default_report_types
  WHERE is_active = true
  ORDER BY display_order;

  -- Insert from default_report_statuses table
  INSERT INTO report_statuses (company_id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal)
  SELECT NEW.id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal
  FROM default_report_statuses
  WHERE is_active = true
  ORDER BY display_order;

  -- Build content_blocks JSONB from default_content_blocks
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', id::text, 'content', content, 'order', display_order)
    ORDER BY display_order
  ), '[]'::jsonb)
  INTO blocks
  FROM default_content_blocks
  WHERE is_active = true;

  -- Update new company with default content blocks
  UPDATE companies SET content_blocks = blocks WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_setup_company_defaults
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION setup_company_defaults();

-- Updated_at auto-update function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_company_groups_updated_at BEFORE UPDATE ON company_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 5. 시드 데이터
-- ============================================================

-- 기본 회사 그룹
INSERT INTO company_groups (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', '기본 그룹', 'Default company group');

-- 기본 제보 유형
INSERT INTO default_report_types (type_name, type_name_en, code, display_order) VALUES
  ('부정행위', 'Fraud', 'FRAUD', 1),
  ('횡령/배임', 'Embezzlement', 'EMBEZZLEMENT', 2),
  ('직장 내 괴롭힘', 'Workplace Harassment', 'WORKPLACE_BULLYING', 3),
  ('성희롱/성폭력', 'Sexual Harassment', 'SEXUAL_HARASSMENT', 4),
  ('안전 위반', 'Safety Violation', 'SAFETY_VIOLATION', 5),
  ('기타', 'Other', 'OTHER', 6);

-- 기본 제보 상태
INSERT INTO default_report_statuses (status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal) VALUES
  ('접수대기', 'Pending', '受付待ち', '待受理', '#3b82f6', 1, true, false),
  ('접수보완', 'Needs Revision', '受付補完', '需补充', '#f59e0b', 2, false, false),
  ('접수완료', 'Accepted', '受付完了', '已受理', '#8b5cf6', 3, false, false),
  ('조사진행', 'Investigating', '調査進行', '调查中', '#ec4899', 4, false, false),
  ('조사완료', 'Investigation Complete', '調査完了', '调查完成', '#10b981', 5, false, true);

-- 플랫폼 기본 설정
INSERT INTO platform_settings (key, value, description) VALUES
(
  'login_security',
  '{"max_attempts": 5, "lockout_minutes": 15, "captcha_enabled": true}',
  '로그인 보안 설정'
),
(
  'email_settings',
  '{"provider": "smtp", "host": "", "port": 587, "secure": false, "user": "", "password": "", "from_name": "모두의 제보채널", "from_email": "", "enabled": false}',
  '이메일 발송 설정'
),
(
  'sms_settings',
  '{"provider": "", "api_key": "", "sender_number": "", "enabled": false}',
  'SMS 발송 설정'
);

-- 역할별 권한 설정
INSERT INTO platform_settings (key, value, description)
VALUES ('role_permissions', '{
  "super_admin": ["dashboard", "users", "companies", "reports", "codes", "subscriptions", "applications", "settings"],
  "admin": ["dashboard", "companies", "reports", "applications"],
  "other_admin": ["dashboard", "companies", "reports", "applications"]
}'::jsonb, '역할별 Super Admin 메뉴 접근 권한')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 6. Storage 버킷 설정 (Supabase Storage)
-- ============================================================
-- 아래는 report-attachments 버킷이 이미 존재할 때 실행합니다.
-- Supabase 대시보드에서 버킷을 먼저 생성한 후 실행하세요.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('report-attachments', 'report-attachments', false);
-- UPDATE storage.buckets
-- SET allowed_mime_types = ARRAY[
--   'application/pdf',
--   'image/jpeg',
--   'image/png',
--   'image/gif',
--   'text/plain',
--   'application/msword',
--   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--   'application/vnd.ms-excel',
--   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--   'application/octet-stream'
-- ]
-- WHERE id = 'report-attachments';


-- ============================================================
-- 완료! 모든 테이블, 인덱스, RLS, 함수, 트리거, 시드 데이터가 생성되었습니다.
-- ============================================================
