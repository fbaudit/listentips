-- Add de-identified content storage to reports table
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS deidentified_data JSONB DEFAULT NULL;

COMMENT ON COLUMN reports.deidentified_data IS 'AI-generated de-identified content: { deidentifiedTitle, deidentifiedContent, deidentifiedFields, mappingTable, generatedAt }';
