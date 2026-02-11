CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  business_number VARCHAR(20),
  industry VARCHAR(100),
  employee_count INTEGER,
  address TEXT,
  department VARCHAR(100),
  report_types TEXT[],
  welcome_message TEXT,
  display_fields TEXT[],
  preferred_locale VARCHAR(5) DEFAULT 'ko',
  use_ai_validation BOOLEAN NOT NULL DEFAULT false,
  use_chatbot BOOLEAN NOT NULL DEFAULT false,
  admin_name VARCHAR(100) NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  admin_phone VARCHAR(20),
  admin_username VARCHAR(100) NOT NULL,
  admin_password_hash VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  status application_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(admin_email);
