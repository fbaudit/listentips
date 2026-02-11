CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL,
  company_code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  business_number VARCHAR(20),
  representative_name VARCHAR(100),
  industry VARCHAR(100),
  employee_count INTEGER,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  logo_url VARCHAR(500),
  description TEXT,
  welcome_message TEXT,
  primary_color VARCHAR(7) DEFAULT '#1a1a2e',
  use_ai_validation BOOLEAN NOT NULL DEFAULT false,
  use_chatbot BOOLEAN NOT NULL DEFAULT false,
  preferred_locale VARCHAR(5) DEFAULT 'ko',
  service_start TIMESTAMPTZ,
  service_end TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_code ON companies(company_code);
CREATE INDEX idx_companies_group ON companies(group_id);
CREATE INDEX idx_companies_active ON companies(is_active);
