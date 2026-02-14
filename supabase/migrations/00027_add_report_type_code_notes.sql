-- Add code and notes columns to report_types
ALTER TABLE report_types ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE report_types ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create default_report_types table (system-level defaults managed by Super Admin)
CREATE TABLE IF NOT EXISTS default_report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name VARCHAR(200) NOT NULL,
  type_name_en VARCHAR(200),
  code VARCHAR(50),
  description TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default report types from existing hardcoded values
INSERT INTO default_report_types (type_name, type_name_en, code, display_order) VALUES
  ('부정행위', 'Fraud', 'FRAUD', 1),
  ('횡령/배임', 'Embezzlement', 'EMBEZZLEMENT', 2),
  ('직장 내 괴롭힘', 'Workplace Harassment', 'WORKPLACE_BULLYING', 3),
  ('성희롱/성폭력', 'Sexual Harassment', 'SEXUAL_HARASSMENT', 4),
  ('안전 위반', 'Safety Violation', 'SAFETY_VIOLATION', 5),
  ('기타', 'Other', 'OTHER', 6);

-- Update setup_company_defaults function to include code field
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert from default_report_types
  INSERT INTO report_types (company_id, type_name, type_name_en, code, description, notes, display_order)
  SELECT NEW.id, type_name, type_name_en, code, description, notes, display_order
  FROM default_report_types
  WHERE is_active = true
  ORDER BY display_order;

  -- Default report statuses
  INSERT INTO report_statuses (company_id, status_name, status_name_en, status_name_ja, status_name_zh, color_code, display_order, is_default, is_terminal) VALUES
    (NEW.id, '접수대기', 'Pending', '受付待ち', '待受理', '#3b82f6', 1, true, false),
    (NEW.id, '접수보완', 'Needs Revision', '受付補完', '需补充', '#f59e0b', 2, false, false),
    (NEW.id, '접수완료', 'Accepted', '受付完了', '已受理', '#8b5cf6', 3, false, false),
    (NEW.id, '조사진행', 'Investigating', '調査進行', '调查中', '#ec4899', 4, false, false),
    (NEW.id, '조사완료', 'Investigation Complete', '調査完了', '调查完成', '#10b981', 5, false, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
