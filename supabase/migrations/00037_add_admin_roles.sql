-- Add new admin roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'other_admin';

-- Add role-based menu permissions setting
INSERT INTO platform_settings (key, value, description)
VALUES ('role_permissions', '{
  "super_admin": ["dashboard", "users", "companies", "reports", "codes", "subscriptions", "applications", "settings"],
  "admin": ["dashboard", "companies", "reports", "applications"],
  "other_admin": ["dashboard", "companies", "reports", "applications"]
}'::jsonb, '역할별 Super Admin 메뉴 접근 권한')
ON CONFLICT (key) DO NOTHING;
