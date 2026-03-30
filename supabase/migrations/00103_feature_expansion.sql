-- ============================================================
-- Feature Expansion Migration
-- Phase 1~3 전체 기능에 필요한 스키마 변경
-- ============================================================

-- ── Phase 1-1: 제보 진행상황 타임라인 ──
-- report_timeline: 제보의 상태 변경/이벤트 이력
CREATE TABLE IF NOT EXISTS report_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'submitted', 'acknowledged', 'under_review', 'investigating', 'resolved', 'closed', 'comment_added', 'assigned', 'escalated'
  event_label TEXT NOT NULL, -- 사용자에게 보여질 텍스트
  actor_type VARCHAR(20) DEFAULT 'system', -- 'system', 'admin', 'reporter'
  actor_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_timeline_report_id ON report_timeline(report_id);

-- ── Phase 1-2: SLA 타이머 ──
-- reports 테이블에 SLA 관련 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ; -- 접수 확인 시각 (7일 SLA)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;     -- 피드백 제공 시각 (3개월 SLA)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_acknowledged BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_feedback BOOLEAN DEFAULT FALSE;

-- ── Phase 1-3: AI 자동 분류 ──
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_category VARCHAR(100);    -- AI가 분류한 카테고리
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_urgency VARCHAR(20);      -- 'low', 'medium', 'high', 'critical'
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_classification JSONB;     -- AI 분류 상세 결과

-- ── Phase 2-1: 사건 워크플로 ──
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id); -- 담당자
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS investigation_started_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_summary TEXT;      -- 처리 결과 요약
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'; -- 'low', 'medium', 'high', 'critical'

-- ── Phase 2-3: Webhook 알림 ──
CREATE TABLE IF NOT EXISTS company_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  provider VARCHAR(20) DEFAULT 'custom', -- 'slack', 'teams', 'custom'
  events TEXT[] DEFAULT ARRAY['new_report'], -- 'new_report', 'status_change', 'new_comment', 'assigned', 'sla_warning'
  is_active BOOLEAN DEFAULT TRUE,
  secret_key VARCHAR(100), -- webhook 서명용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_webhooks_company ON company_webhooks(company_id);

-- ── Phase 2-4: 음성 제보 ──
ALTER TABLE report_attachments ADD COLUMN IF NOT EXISTS is_voice_recording BOOLEAN DEFAULT FALSE;
ALTER TABLE report_attachments ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- ── Phase 3-2: 제보 임시저장 ──
CREATE TABLE IF NOT EXISTS report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  draft_token VARCHAR(64) NOT NULL UNIQUE, -- 브라우저에서 식별용 토큰
  title TEXT,
  content TEXT,
  report_type_id UUID,
  form_data JSONB DEFAULT '{}', -- 기타 폼 데이터
  expires_at TIMESTAMPTZ NOT NULL, -- 24시간 후 자동 삭제
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_drafts_token ON report_drafts(draft_token);
CREATE INDEX IF NOT EXISTS idx_report_drafts_expires ON report_drafts(expires_at);

-- ── Phase 3-3: 제보 만족도 ──
ALTER TABLE reports ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER;  -- 1~5
ALTER TABLE reports ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS satisfaction_at TIMESTAMPTZ;

-- ── Phase 3-4: 데이터 보존/파기 정책 ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_retention_months INTEGER DEFAULT 36; -- 기본 3년
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_purge_enabled BOOLEAN DEFAULT FALSE;

-- ── RLS ──
ALTER TABLE report_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_drafts ENABLE ROW LEVEL SECURITY;
