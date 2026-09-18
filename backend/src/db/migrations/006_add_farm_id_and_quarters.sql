-- ============================================================
-- 006_add_farm_id_and_quarters.sql
--
-- Adds a short, human-typeable `farm_id` to every user - this is what
-- gets punched into a hub/collar/cup's setup screen so its telemetry
-- is only ever accepted for that farmer's own herd (see
-- telemetryIngestService.js). Also allows signing in with farm_id,
-- not just email/phone.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_id VARCHAR(8) UNIQUE;
