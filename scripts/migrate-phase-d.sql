-- Phase D migration

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  setup_token UUID UNIQUE,
  setup_token_expires_at TIMESTAMPTZ,
  passkey_registered BOOLEAN NOT NULL DEFAULT false,
  member_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Member WebAuthn credentials (mirrors webauthn_credentials)
CREATE TABLE member_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  total_cents INTEGER NOT NULL,
  fulfilled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initiation drops
CREATE TABLE initiation_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_month DATE NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  open_time TEXT NOT NULL DEFAULT '00:00',
  early_access_time TEXT NOT NULL DEFAULT '23:45',
  close_time TEXT NOT NULL DEFAULT '00:29',
  available_count INTEGER NOT NULL DEFAULT 500,
  sold_count INTEGER NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Early access tokens
CREATE TABLE early_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES initiation_drops(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update sms_signups: add name column
ALTER TABLE sms_signups ADD COLUMN IF NOT EXISTS name TEXT;

-- Update product_overrides: add dual-price columns
ALTER TABLE product_overrides
  ADD COLUMN IF NOT EXISTS initiation_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS member_price_cents INTEGER;
-- Note: existing price column is preserved for now; ProductEditor will be
-- updated in Phase D-2 to edit the new columns. Drop price column in Phase D-2.
