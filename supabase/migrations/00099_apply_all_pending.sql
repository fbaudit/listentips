-- ============================================
-- 미적용 마이그레이션 통합 (00020 ~ 00031)
-- Supabase SQL Editor에서 한번에 실행하세요
-- ============================================

-- 00020: channel_name
ALTER TABLE companies ADD COLUMN IF NOT EXISTS channel_name VARCHAR(200) DEFAULT '익명 제보 채널';

-- 00021: report_guide_message
ALTER TABLE companies ADD COLUMN IF NOT EXISTS report_guide_message TEXT;

-- 00022: content_blocks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='content_blocks') THEN
    ALTER TABLE companies ADD COLUMN content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 00025: AI provider config
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_encryption_iv TEXT;

-- 00026: premium subscription plans
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'premium_monthly' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_plan')) THEN
    ALTER TYPE subscription_plan ADD VALUE 'premium_monthly';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'premium_yearly' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_plan')) THEN
    ALTER TYPE subscription_plan ADD VALUE 'premium_yearly';
  END IF;
END $$;

-- 00027: report_type code & notes
ALTER TABLE report_types ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE report_types ADD COLUMN IF NOT EXISTS notes TEXT;

-- 00028: encryption and 2FA
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_encryption_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_encryption_iv TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_key_hash TEXT;

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'login_2fa',
  sent_via VARCHAR(20),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id, type, expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_cleanup ON verification_codes(expires_at) WHERE used = false;

-- 00029: reporter access logs
CREATE TABLE IF NOT EXISTS reporter_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_reporter_access_logs_report_id ON reporter_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_reporter_access_logs_accessed_at ON reporter_access_logs(accessed_at DESC);

-- 00030: security settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS block_foreign_ip BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS allowed_countries TEXT[] NOT NULL DEFAULT ARRAY['KR'];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ip_blocklist TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rate_limit_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rate_limit_max_reports INTEGER NOT NULL DEFAULT 5;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rate_limit_window_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS min_password_length INTEGER NOT NULL DEFAULT 8;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_special_chars BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_reports_rate_limit ON reports(company_id, reporter_ip_hash, created_at DESC);

-- 00031: document title & is_active
ALTER TABLE company_documents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE company_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
UPDATE company_documents SET title = file_name WHERE title IS NULL;
