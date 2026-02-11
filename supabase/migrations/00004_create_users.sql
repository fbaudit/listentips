CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'company_admin',
  phone VARCHAR(20),
  mobile VARCHAR(20),
  country VARCHAR(50) DEFAULT 'KR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret VARCHAR(255),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
