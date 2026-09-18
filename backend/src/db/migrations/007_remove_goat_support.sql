-- ============================================================
-- 007_remove_goat_support.sql
--
-- Removes goat support entirely - DairyGuard AI now tracks only cows
-- and buffaloes. Safe to run whether or not this database ever had
-- goat data or the goat-only 'L'/'R' quarter values (both steps are
-- no-ops if there's nothing to clean up).
--
-- Postgres can't drop a single enum value directly, so both enums are
-- rebuilt via the standard rename-old / create-new / migrate-column
-- pattern.
-- ============================================================

-- 1. Remove any goat animals - cascades to their telemetry, quarter
--    readings, risk history, recommendations, events, and devices via
--    the existing foreign keys.
DELETE FROM bovine_registry WHERE species::text = 'goat';

-- 2. Rebuild species_type without 'goat'.
ALTER TYPE species_type RENAME TO species_type_old;
CREATE TYPE species_type AS ENUM ('cow', 'buffalo');
ALTER TABLE bovine_registry
  ALTER COLUMN species TYPE species_type USING species::text::species_type;
DROP TYPE species_type_old;

-- 3. Rebuild quarter_type without the goat-only 'L'/'R' values - cows and
--    buffaloes only ever use the four mammary quarters.
DELETE FROM quarter_readings WHERE quarter::text IN ('L', 'R');
ALTER TYPE quarter_type RENAME TO quarter_type_old;
CREATE TYPE quarter_type AS ENUM ('LF', 'RF', 'LR', 'RR');
ALTER TABLE sensor_telemetry
  ALTER COLUMN quarter TYPE quarter_type USING quarter::text::quarter_type;
ALTER TABLE quarter_readings
  ALTER COLUMN quarter TYPE quarter_type USING quarter::text::quarter_type;
DROP TYPE quarter_type_old;
