-- 기업별 데이터 암호화 키 저장 (시스템 키로 이중 암호화)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_encryption_key TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_encryption_iv TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_key_hash TEXT;

-- 2FA 인증 코드 테이블
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
