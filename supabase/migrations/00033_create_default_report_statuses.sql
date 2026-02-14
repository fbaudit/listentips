-- Create default_report_statuses table (system-level defaults managed by Super Admin)
CREATE TABLE IF NOT EXISTS default_report_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_name VARCHAR(100) NOT NULL,
  status_name_en VARCHAR(100),
  status_name_ja VARCHAR(100),
  status_name_zh VARCHAR(100),
  color_code VARCHAR(7) NOT NULL DEFAULT '#6b7280',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default report statuses from existing hardcoded values
INSERT INTO default_report_statuses (status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal) VALUES
  ('접수대기', 'Pending', '受付待ち', '待受理', '#3b82f6', 1, true, false),
  ('접수보완', 'Needs Revision', '受付補完', '需补充', '#f59e0b', 2, false, false),
  ('접수완료', 'Accepted', '受付完了', '已受理', '#8b5cf6', 3, false, false),
  ('조사진행', 'Investigating', '調査進行', '调查中', '#ec4899', 4, false, false),
  ('조사완료', 'Investigation Complete', '調査完了', '调查完成', '#10b981', 5, false, true);

-- Update setup_company_defaults() to read from default_report_statuses table
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert from default_report_types table
  INSERT INTO report_types (company_id, type_name, type_name_en, code, description, notes, display_order)
  SELECT NEW.id, type_name, type_name_en, code, description, notes, display_order
  FROM default_report_types
  WHERE is_active = true
  ORDER BY display_order;

  -- Insert from default_report_statuses table
  INSERT INTO report_statuses (company_id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal)
  SELECT NEW.id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal
  FROM default_report_statuses
  WHERE is_active = true
  ORDER BY display_order;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
