-- ============================================================
-- 004_create_risk_and_events.sql
-- Supporting tables for the dashboard's Predictions, Analytics and
-- History pages: rolling risk-score trend, quarter-level deltas,
-- AI/vet recommendations, and the herd event/audit log.
-- ============================================================

-- Daily (or per-inference-run) risk score, feeding the AnimalDetailPage trend chart
CREATE TABLE IF NOT EXISTS risk_history (
  id            BIGSERIAL PRIMARY KEY,
  animal_id     UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  risk_score    SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level    risk_level NOT NULL,
  source        VARCHAR(20) NOT NULL DEFAULT 'rule_engine', -- 'rule_engine' | 'xgboost_v1' | ...
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_history_animal_time
  ON risk_history (animal_id, recorded_at DESC);

-- Per-quarter deltas (EC/temp/yield) shown on the udder diagram in AnimalDetailPage
CREATE TABLE IF NOT EXISTS quarter_readings (
  id             BIGSERIAL PRIMARY KEY,
  animal_id      UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  quarter        quarter_type NOT NULL,
  ec_delta_pct   NUMERIC(6,2) NOT NULL DEFAULT 0,
  temp_delta_c   NUMERIC(5,2) NOT NULL DEFAULT 0,
  yield_drop_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quarter_readings_animal_time
  ON quarter_readings (animal_id, recorded_at DESC);

-- AI-generated / vet-issued recommendations shown on PredictionsPage
CREATE TABLE IF NOT EXISTS recommendations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id    UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  profile      VARCHAR(120) NOT NULL,   -- e.g. "Acute / Environmental"
  action       TEXT NOT NULL,
  urgency      risk_level NOT NULL,
  issued_by    UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- null = AI-generated
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommendations_animal ON recommendations(animal_id);

-- Herd-wide audit/event timeline shown on HistoryPage
CREATE TABLE IF NOT EXISTS herd_events (
  id           BIGSERIAL PRIMARY KEY,
  animal_id    UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  event_text   TEXT NOT NULL,
  event_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_herd_events_date ON herd_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_herd_events_animal ON herd_events(animal_id);
