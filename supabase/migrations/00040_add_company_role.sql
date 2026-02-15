-- Add company_role column for company-level sub-role permissions
-- 'manager' = full access, 'user' = dashboard + reports, 'other' = dashboard only
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role VARCHAR(20) NOT NULL DEFAULT 'manager';

-- Index for queries filtering by company_role
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_role) WHERE role = 'company_admin';
