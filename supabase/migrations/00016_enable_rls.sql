-- Enable RLS on all tables
ALTER TABLE company_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- Public read for active companies (report channel needs this)
CREATE POLICY "public_company_read" ON companies
  FOR SELECT USING (is_active = true);

-- Public read for active report types
CREATE POLICY "public_report_types_read" ON report_types
  FOR SELECT USING (is_active = true);

-- Public read for report statuses
CREATE POLICY "public_report_statuses_read" ON report_statuses
  FOR SELECT USING (true);

-- Public insert for applications
CREATE POLICY "public_application_insert" ON applications
  FOR INSERT WITH CHECK (true);

-- Service role bypasses RLS for all operations
