-- Create default_content_blocks table for Super Admin to manage
CREATE TABLE IF NOT EXISTS default_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update setup_company_defaults() to also copy default content blocks
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
DECLARE
  blocks JSONB;
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

  -- Build content_blocks JSONB from default_content_blocks
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', id::text, 'content', content, 'order', display_order)
    ORDER BY display_order
  ), '[]'::jsonb)
  INTO blocks
  FROM default_content_blocks
  WHERE is_active = true;

  -- Update new company with default content blocks
  UPDATE companies SET content_blocks = blocks WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
