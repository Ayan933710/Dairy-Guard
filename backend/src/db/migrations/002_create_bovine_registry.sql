-- ============================================================
-- 002_create_bovine_registry.sql
-- Bovine_Registry: master record for every animal, indexed by a
-- 15-digit RFID/AIN (Animal Identification Number) tag, as read by
-- the Smart Cup's 134.2 kHz LF RFID reader.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE species_type AS ENUM ('cow', 'buffalo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('No Risk', 'Low Risk', 'Moderate Risk', 'High Risk');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS bovine_registry (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human/UI-facing short tag shown in the dashboard, e.g. "C-104"
  display_tag       VARCHAR(20)  NOT NULL UNIQUE,

  -- 15-digit RFID / AIN as read from the ear tag, e.g. "982000123456789"
  rfid_tag          CHAR(15)     NOT NULL UNIQUE
                     CONSTRAINT chk_rfid_15_digits CHECK (rfid_tag ~ '^[0-9]{15}$'),

  name              VARCHAR(80)  NOT NULL,
  species           species_type NOT NULL,
  breed             VARCHAR(80)  NOT NULL,
  age               SMALLINT     NOT NULL CHECK (age >= 0),
  lactation_number  SMALLINT     NOT NULL DEFAULT 0 CHECK (lactation_number >= 0),

  owner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Latest cached risk snapshot (kept in sync by the AI inference service /
  -- risk engine so the herd overview page can query a single table for
  -- listing without joining the full risk_assessments history every time).
  current_risk_level risk_level NOT NULL DEFAULT 'No Risk',
  current_risk_score SMALLINT   NOT NULL DEFAULT 0 CHECK (current_risk_score BETWEEN 0 AND 100),
  rumination_delta_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  thi                 NUMERIC(5,2) NOT NULL DEFAULT 0, -- Temperature-Humidity Index

  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bovine_rfid ON bovine_registry(rfid_tag);
CREATE INDEX IF NOT EXISTS idx_bovine_owner ON bovine_registry(owner_id);
CREATE INDEX IF NOT EXISTS idx_bovine_species ON bovine_registry(species);
CREATE INDEX IF NOT EXISTS idx_bovine_risk_level ON bovine_registry(current_risk_level);
