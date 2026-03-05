-- Add device_type column to reports table
-- Tracks whether the report was submitted from PC or mobile device
ALTER TABLE reports ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT NULL;

COMMENT ON COLUMN reports.device_type IS 'Device type used for submission: pc, mobile, tablet';
