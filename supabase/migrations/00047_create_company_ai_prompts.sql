-- Company-specific AI prompt customization
CREATE TABLE IF NOT EXISTS company_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, prompt_type)
);

COMMENT ON TABLE company_ai_prompts IS 'Company-specific AI prompt templates that override defaults';
COMMENT ON COLUMN company_ai_prompts.prompt_type IS 'Type: deidentification, summary, violation, investigation_plan, questionnaire, investigation_report, auto_reply';
COMMENT ON COLUMN company_ai_prompts.prompt_template IS 'Custom prompt template with {placeholders}';

-- Enable RLS
ALTER TABLE company_ai_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: company admins can manage their own prompts
CREATE POLICY "company_ai_prompts_company_access" ON company_ai_prompts
  FOR ALL USING (true);
