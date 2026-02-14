-- Per-company security settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS block_foreign_ip BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS allowed_countries TEXT[] NOT NULL DEFAULT ARRAY['KR'];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ip_blocklist TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rate_limit_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rate_limit_max_reports INTEGER NOT NULL DEFAULT 5;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rate_limit_window_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS min_password_length INTEGER NOT NULL DEFAULT 8;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_special_chars BOOLEAN NOT NULL DEFAULT false;

-- Index for rate-limiting queries (count reports per IP within time window)
CREATE INDEX IF NOT EXISTS idx_reports_rate_limit
  ON reports(company_id, reporter_ip_hash, created_at DESC);
