-- ============================================================
-- 005_create_devices.sql
-- Device registry: every physical ESP32-S3 Smart Collar / Smart Cup /
-- NANDI Hub in the field, so the ingestion route can validate
-- device_id and the dashboard can show "last seen" / battery health.
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
  id            VARCHAR(64) PRIMARY KEY,      -- ESP32 MAC address or serial, used as device_id
  device_type   device_type NOT NULL,
  animal_id     UUID NULL REFERENCES bovine_registry(id) ON DELETE SET NULL, -- null for hubs
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(120) NULL,
  firmware_version VARCHAR(30) NULL,
  battery_pct   SMALLINT NULL,
  last_seen_at  TIMESTAMPTZ NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_id);
CREATE INDEX IF NOT EXISTS idx_devices_animal ON devices(animal_id);
