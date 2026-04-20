-- Build 2 Phase B1 migration
-- Run once against your Neon database via the Neon SQL editor or psql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS page_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug   TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by  UUID,
  UNIQUE (page_slug, field_key)
);

CREATE TABLE IF NOT EXISTS sms_signups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  email       TEXT,
  source      TEXT NOT NULL CHECK (source IN ('protocol_cta', 'blocked_purchase')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);
