-- Add per-company 2FA setting
ALTER TABLE companies ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
