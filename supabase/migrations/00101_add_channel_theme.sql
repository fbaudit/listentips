-- Add channel_theme column for report channel theming
-- Options: minimal, warm, dark-elegant, futuristic, vibrant
-- Legacy values (branded, glassmorphism, card-grid, dark-secure) are handled in app code
ALTER TABLE companies ADD COLUMN IF NOT EXISTS channel_theme VARCHAR(30) DEFAULT 'minimal';
