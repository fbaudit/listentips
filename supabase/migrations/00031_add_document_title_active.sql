-- Add title and is_active columns to company_documents for chatbot RAG
ALTER TABLE company_documents
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill: set title from file_name for any existing rows
UPDATE company_documents SET title = file_name WHERE title IS NULL;
