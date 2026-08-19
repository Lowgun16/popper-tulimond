-- Phase D-2 migration: Store Control & 3-Text Scheduler
-- Additive. Safe to run once against production Neon.

ALTER TABLE initiation_drops
  ADD COLUMN IF NOT EXISTS opens_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS early_access_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closes_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_minutes   INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS announce_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS announce_message TEXT,
  ADD COLUMN IF NOT EXISTS announce_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS earlybird_sent_at TIMESTAMPTZ;

ALTER TABLE initiation_drops ADD COLUMN IF NOT EXISTS limit_one_per_nonmember BOOLEAN NOT NULL DEFAULT false;

-- Backfill any existing legacy rows (drop_month + time strings) into timestamps.
-- Legacy early access was 11:45pm the day BEFORE drop_month; open at midnight of drop_month.
UPDATE initiation_drops
SET
  opens_at        = COALESCE(opens_at,        (drop_month::timestamp AT TIME ZONE timezone)),
  early_access_at = COALESCE(early_access_at, (drop_month::timestamp AT TIME ZONE timezone) - INTERVAL '15 minutes'),
  closes_at       = COALESCE(closes_at,       (drop_month::timestamp AT TIME ZONE timezone) + (window_minutes * INTERVAL '1 minute')),
  reminder_at     = COALESCE(reminder_at,     (drop_month::timestamp AT TIME ZONE timezone) - INTERVAL '8 hours 15 minutes'),
  status          = CASE WHEN status = 'draft' THEN 'scheduled' ELSE status END
WHERE opens_at IS NULL;

-- Multiple openings over time are allowed; at most one is "current".
ALTER TABLE initiation_drops DROP CONSTRAINT IF EXISTS initiation_drops_drop_month_key;
ALTER TABLE initiation_drops ALTER COLUMN drop_month DROP NOT NULL;

CREATE INDEX IF NOT EXISTS initiation_drops_opens_at_idx ON initiation_drops(opens_at);
