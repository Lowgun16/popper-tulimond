-- Phase C migration — run in Neon console after migrate-b2.sql

CREATE TABLE IF NOT EXISTS product_overrides (
  item_id       TEXT PRIMARY KEY,           -- matches OutfitItem.id from inventory.ts
  price         TEXT,                       -- e.g. "$129" — overrides inventory price when set
  display_name  TEXT,                       -- overrides item name shown in Vault when set
  product_image TEXT,                       -- path like /assets/models/Jack/Jack-Show-Long.png
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'sold_out', 'hidden')),
  is_draft      BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_overrides_status ON product_overrides(status);
