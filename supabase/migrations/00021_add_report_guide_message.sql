-- Add report_guide_message column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS report_guide_message TEXT;

COMMENT ON COLUMN companies.report_guide_message IS '제보 접수 화면의 제보 내용 입력란에 표시되는 안내문구';
