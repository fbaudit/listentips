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
