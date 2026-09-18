-- Vet credentials and the farm location/status fields used by the district dashboard.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vet_state VARCHAR(80),
  ADD COLUMN IF NOT EXISTS vet_district VARCHAR(120),
  ADD COLUMN IF NOT EXISTS registration_number VARCHAR(80),
  ADD COLUMN IF NOT EXISTS farm_state VARCHAR(80),
  ADD COLUMN IF NOT EXISTS farm_district VARCHAR(120),
  ADD COLUMN IF NOT EXISTS hub_latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS hub_longitude NUMERIC(9,6);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_registration_number
  ON users (registration_number)
  WHERE registration_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_farm_district ON users (farm_district);

ALTER TABLE bovine_registry
  ADD COLUMN IF NOT EXISTS current_mastitis_status VARCHAR(20) NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS current_amr_status VARCHAR(20) NOT NULL DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS current_amr_score SMALLINT NOT NULL DEFAULT 0
    CHECK (current_amr_score BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_bovine_amr_status ON bovine_registry(current_amr_status);

CREATE TABLE IF NOT EXISTS amr_history (
  id BIGSERIAL PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  amr_score SMALLINT NOT NULL CHECK (amr_score BETWEEN 0 AND 100),
  amr_status VARCHAR(20) NOT NULL DEFAULT 'stable',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_amr_history_animal_time
  ON amr_history (animal_id, recorded_at DESC);