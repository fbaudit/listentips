-- Add AI provider configuration columns to companies table
ALTER TABLE companies
ADD COLUMN ai_provider VARCHAR(20),
ADD COLUMN ai_api_key_encrypted TEXT,
ADD COLUMN ai_encryption_iv TEXT;
