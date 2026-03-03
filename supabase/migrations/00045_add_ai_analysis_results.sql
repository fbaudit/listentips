-- Add AI analysis results storage to reports table
-- Stores all analysis results (summary, violation, investigation_plan, questionnaire, investigation_report)
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS ai_analysis_results JSONB DEFAULT NULL;

COMMENT ON COLUMN reports.ai_analysis_results IS 'Saved AI analysis results keyed by type: { summary: {...}, violation: {...}, investigation_plan: {...}, questionnaire: {...}, investigation_report: {...} }';
