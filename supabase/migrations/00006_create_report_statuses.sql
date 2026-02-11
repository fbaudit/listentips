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
