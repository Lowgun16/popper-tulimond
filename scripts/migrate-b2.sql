-- Build 2 Phase B2 migration
-- Run once in Neon console after migrate-b1.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  credential_id   TEXT UNIQUE NOT NULL,
  public_key      TEXT NOT NULL,
  counter         INTEGER DEFAULT 0,
  device_name     TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_recovery (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used        BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT UNIQUE NOT NULL,
  created_by  UUID NOT NULL REFERENCES admin_users(id),
  used        BOOLEAN DEFAULT false,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  page_slug   TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, page_slug, field_key)
);

CREATE TABLE IF NOT EXISTS brand_palette (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hex         TEXT NOT NULL,
  label       TEXT,
  created_by  UUID REFERENCES admin_users(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_page_drafts_user_page ON page_drafts(user_id, page_slug);
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(token);
