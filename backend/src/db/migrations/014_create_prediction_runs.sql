-- Detailed BovineGuard V2.2 inference results. `risk_history` remains the
-- compact chart feed; these tables retain the model's clinical output.
CREATE TABLE IF NOT EXISTS prediction_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id          UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  model_version      VARCHAR(80) NOT NULL,
  mastitis_probability NUMERIC(6,5) NOT NULL CHECK (mastitis_probability BETWEEN 0 AND 1),
  risk_category      VARCHAR(40) NOT NULL,
  pattern            VARCHAR(80),
  pathogen_hint      TEXT,
  affected_quarters  JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_snapshot     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_runs_animal_time
  ON prediction_runs (animal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prediction_quarter_results (
  id                   BIGSERIAL PRIMARY KEY,
  prediction_run_id    UUID NOT NULL REFERENCES prediction_runs(id) ON DELETE CASCADE,
  quarter              VARCHAR(12) NOT NULL,
  mastitis_probability NUMERIC(6,5) NOT NULL CHECK (mastitis_probability BETWEEN 0 AND 1),
  confidence           NUMERIC(6,5) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  risk_category        VARCHAR(40) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_quarter_results_run
  ON prediction_quarter_results (prediction_run_id);