-- Reporter access logs: tracks when reporters log in to check their reports
CREATE TABLE IF NOT EXISTS reporter_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT
);

CREATE INDEX idx_reporter_access_logs_report_id ON reporter_access_logs(report_id);
CREATE INDEX idx_reporter_access_logs_accessed_at ON reporter_access_logs(accessed_at DESC);
