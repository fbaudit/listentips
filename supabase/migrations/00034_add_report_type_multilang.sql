-- Add Japanese and Chinese name columns to default_report_types
ALTER TABLE default_report_types ADD COLUMN IF NOT EXISTS type_name_ja VARCHAR(200);
ALTER TABLE default_report_types ADD COLUMN IF NOT EXISTS type_name_zh VARCHAR(200);

-- Update setup_company_defaults() to copy ja/zh fields
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert from default_report_types table
  INSERT INTO report_types (company_id, type_name, type_name_en, type_name_ja, type_name_zh, code, description, notes, display_order)
  SELECT NEW.id, type_name, type_name_en, type_name_ja, type_name_zh, code, description, notes, display_order
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
