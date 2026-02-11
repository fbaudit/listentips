ALTER TABLE companies ADD COLUMN content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN companies.content_blocks IS 'Array of content blocks shown on report main page. Format: [{id, content, order}]';
