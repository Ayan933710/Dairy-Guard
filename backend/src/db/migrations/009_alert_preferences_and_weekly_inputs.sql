-- Alert language, optional email, weekly farmer check-ins, and hub location updates.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS weekly_farmer_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  morning_milking_count SMALLINT NOT NULL CHECK (morning_milking_count >= 0),
  evening_milking_count SMALLINT NOT NULL CHECK (evening_milking_count >= 0),
  feed_kg NUMERIC(8,2) NOT NULL CHECK (feed_kg >= 0),
  worker_hygiene VARCHAR(20) NOT NULL CHECK (worker_hygiene IN ('good', 'needs_attention', 'poor')),
  antidote_given BOOLEAN NOT NULL DEFAULT FALSE,
  antidote_animal_id UUID NULL REFERENCES bovine_registry(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_farmer_inputs_farmer_week
  ON weekly_farmer_inputs(farmer_id, week_start DESC);
