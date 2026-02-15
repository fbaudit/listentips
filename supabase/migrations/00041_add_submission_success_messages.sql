-- Add customizable submission success messages per company
ALTER TABLE companies ADD COLUMN IF NOT EXISTS submission_success_title TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS submission_success_message TEXT;
