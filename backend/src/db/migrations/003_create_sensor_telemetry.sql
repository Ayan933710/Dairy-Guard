-- ============================================================
-- 003_create_sensor_telemetry.sql
-- Sensor_Telemetry: time-series storage for every reading pushed by
-- ESP32-S3 Smart Collars and Smart Cups (EC, pH, Viscosity Torque,
-- Yield, Rumination, Skin Temp).
--
-- Design notes for time-series performance:
--   * `recorded_at` is the time axis; every query filters/sorts on it,
--     so it is the leading column in the composite index.
--   * (animal_id, recorded_at DESC) covers the most common access
--     pattern: "latest N readings for animal X".
--   * If TimescaleDB is available, uncomment the hypertable call at
--     the bottom to auto-partition this table by time - the schema
--     works identically with or without it, so it's optional for a
--     local/dev Postgres install.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE quarter_type AS ENUM ('LF', 'RF', 'LR', 'RR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE device_type AS ENUM ('collar', 'cup', 'hub');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sensor_telemetry (
  id                BIGSERIAL PRIMARY KEY,
  animal_id         UUID NOT NULL REFERENCES bovine_registry(id) ON DELETE CASCADE,
  device_id         VARCHAR(64) NOT NULL,        -- ESP32 device MAC / serial
  device_type       device_type NOT NULL DEFAULT 'cup',
  quarter           quarter_type NULL,            -- only relevant for Smart Cup (per-quarter) readings

  -- Raw sensor payload fields exactly as published by firmware
  ec                NUMERIC(8,3) NULL,             -- Electrical Conductivity (mS/cm)
  ph                NUMERIC(5,2) NULL,              -- pH level
  viscosity_torque  NUMERIC(8,3) NULL,              -- CMT motor torque / current draw proxy
  milk_yield        NUMERIC(8,3) NULL,              -- litres for this session/quarter
  rumination        NUMERIC(8,3) NULL,              -- rumination index / minutes-per-hour from collar IMU
  skin_temp         NUMERIC(5,2) NULL,               -- degrees C from DS18B20 / MLX90614

  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(), -- when the ESP32 captured the reading
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(), -- when our ingestion route received it
  raw_payload       JSONB NULL                          -- full original JSON, kept for audit/AI retraining
);

-- Primary time-series access pattern: latest readings per animal
CREATE INDEX IF NOT EXISTS idx_telemetry_animal_time
  ON sensor_telemetry (animal_id, recorded_at DESC);

-- Device-centric lookups (e.g. "last seen" health checks per device)
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time
  ON sensor_telemetry (device_id, recorded_at DESC);

-- Fleet-wide time-range queries (analytics dashboards)
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at
  ON sensor_telemetry (recorded_at DESC);

-- Optional: turn this into a TimescaleDB hypertable for automatic time
-- partitioning + compression once the `timescaledb` extension is installed.
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
-- SELECT create_hypertable('sensor_telemetry', 'recorded_at', if_not_exists => TRUE);
