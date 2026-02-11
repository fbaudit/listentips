-- Login attempts tracking for rate limiting
CREATE TABLE login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  ip_hash TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_login_attempts_username ON login_attempts(username, attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_hash, attempted_at);
