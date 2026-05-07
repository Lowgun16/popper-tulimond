-- Run this in your Neon console to add the checkout_intents lead capture table

CREATE TABLE IF NOT EXISTS checkout_intents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT,
  email        TEXT NOT NULL,
  phone        TEXT,
  cart_items   JSONB NOT NULL DEFAULT '[]',
  drop_id      UUID REFERENCES initiation_drops(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS checkout_intents_email_idx   ON checkout_intents(email);
CREATE INDEX IF NOT EXISTS checkout_intents_drop_id_idx ON checkout_intents(drop_id);
