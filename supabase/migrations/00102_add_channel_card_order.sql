-- Card order for report channel page
-- JSON array of card IDs: ["submit", "check", "content"] or custom order
-- "submit" = 제보하기 카드, "check" = 제보확인 카드, "content" = 콘텐츠 블록 영역
ALTER TABLE companies ADD COLUMN IF NOT EXISTS channel_card_order JSONB DEFAULT '["submit", "check", "content"]';
