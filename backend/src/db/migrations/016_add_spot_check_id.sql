-- Groups the four quarter readings that belong to one instantaneous milk test.
ALTER TABLE sensor_telemetry
  ADD COLUMN IF NOT EXISTS spot_check_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_spot_check
  ON sensor_telemetry (spot_check_id);