-- Storage used by the standalone FastAPI/XGBoost service.
-- It is intentionally separate from the normalized Node telemetry table:
-- FastAPI receives string cow identifiers such as C-118 and a complete
-- four-quarter snapshot, while the Node table uses bovine_registry UUIDs.
CREATE TABLE IF NOT EXISTS fastapi_sensor_telemetry (
  id                BIGSERIAL PRIMARY KEY,
  cow_id            VARCHAR(64) NOT NULL,
  readings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  cow_temperature   NUMERIC(5,2),
  rumination_delta  NUMERIC(8,3),
  shed_thi          NUMERIC(6,2),
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fastapi_telemetry_cow_time
  ON fastapi_sensor_telemetry (cow_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS fastapi_prediction_runs (
  id                BIGSERIAL PRIMARY KEY,
  cow_id            VARCHAR(64) NOT NULL,
  model_version     VARCHAR(80) NOT NULL DEFAULT 'BovineGuard V2.2',
  overall_risk_score NUMERIC(5,2) NOT NULL CHECK (overall_risk_score BETWEEN 0 AND 100),
  risk_category     VARCHAR(40) NOT NULL,
  quarters          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fastapi_predictions_cow_time
  ON fastapi_prediction_runs (cow_id, created_at DESC);