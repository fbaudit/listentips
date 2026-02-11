-- Add channel_name column to companies table
ALTER TABLE companies ADD COLUMN channel_name VARCHAR(200) DEFAULT '익명 제보 채널';
