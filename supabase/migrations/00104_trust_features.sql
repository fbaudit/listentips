-- ============================================================
-- Trust & Credibility Features
-- ============================================================

-- 제보 무결성 해시 (위변조 방지)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS integrity_hash VARCHAR(64);

-- 보안 점수 캐시 (매 저장 시 갱신)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS security_score INTEGER DEFAULT 0;

-- 컴플라이언스 자가진단 결과 저장
ALTER TABLE companies ADD COLUMN IF NOT EXISTS compliance_checklist JSONB DEFAULT '{}';
