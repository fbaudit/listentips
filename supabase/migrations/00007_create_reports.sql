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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_reports_number ON reports(report_number);
CREATE INDEX idx_reports_status ON reports(status_id);
CREATE INDEX idx_reports_type ON reports(report_type_id);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
