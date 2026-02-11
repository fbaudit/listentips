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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_types_company ON report_types(company_id);
