CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  name TEXT PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'viewer',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  permissions JSONB,
  preferences JSONB,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  email_verified_at TIMESTAMP,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,
  mfa_settings JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID
);
CREATE TABLE IF NOT EXISTS runtime_ai_provider_receipts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider VARCHAR(32) NOT NULL CHECK(provider='openrouter'),
  provider_request_id VARCHAR(160) NOT NULL,
  model VARCHAR(160) NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,provider_request_id)
);
CREATE INDEX IF NOT EXISTS runtime_ai_receipts_identity_idx ON runtime_ai_provider_receipts(user_id,created_at DESC);
