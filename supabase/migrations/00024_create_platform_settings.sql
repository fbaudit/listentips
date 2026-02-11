-- Platform-wide settings (managed by super admin)
CREATE TABLE platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default settings
INSERT INTO platform_settings (key, value, description) VALUES
(
  'login_security',
  '{"max_attempts": 5, "lockout_minutes": 15, "captcha_enabled": true}',
  '로그인 보안 설정'
),
(
  'email_settings',
  '{"provider": "smtp", "host": "", "port": 587, "secure": false, "user": "", "password": "", "from_name": "모두의 제보채널", "from_email": "", "enabled": false}',
  '이메일 발송 설정'
),
(
  'sms_settings',
  '{"provider": "", "api_key": "", "sender_number": "", "enabled": false}',
  'SMS 발송 설정'
);
