-- Cart image migration — run in Neon console
-- Adds a separate cart_image column to product_overrides.
-- Defaults to NULL, which means "use product_image as the cart thumbnail".

ALTER TABLE product_overrides
  ADD COLUMN IF NOT EXISTS cart_image TEXT;
