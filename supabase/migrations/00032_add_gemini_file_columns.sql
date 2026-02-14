-- Gemini File API metadata for RAG
ALTER TABLE company_documents
ADD COLUMN IF NOT EXISTS gemini_file_uri TEXT,
ADD COLUMN IF NOT EXISTS gemini_file_name TEXT,
ADD COLUMN IF NOT EXISTS gemini_uploaded_at TIMESTAMPTZ;
