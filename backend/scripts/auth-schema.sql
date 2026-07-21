CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  subdomain VARCHAR(50) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE,
  description TEXT,
  plan VARCHAR(32) NOT NULL DEFAULT 'trial',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  billing_info JSON,
  features JSON NOT NULL DEFAULT '{}'::json,
  usage_limits JSON,
  integrations JSON,
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  logo_url VARCHAR(255),
  branding JSON,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSON;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSON;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_settings JSON;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users (tenant_id);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
