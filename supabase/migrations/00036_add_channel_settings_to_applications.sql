-- Add channel settings columns to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS channel_name VARCHAR(200);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS report_guide_message TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]'::jsonb;
