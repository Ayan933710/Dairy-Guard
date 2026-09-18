-- Cooperative accounts use the same Farm ID identity as farmer accounts.
-- RFID/AIN values may be 8-15 alphanumeric characters.
ALTER TABLE bovine_registry
  ALTER COLUMN rfid_tag TYPE VARCHAR(15) USING TRIM(rfid_tag);

ALTER TABLE bovine_registry
  DROP CONSTRAINT IF EXISTS chk_rfid_15_digits;

ALTER TABLE bovine_registry
  ADD CONSTRAINT chk_rfid_alphanumeric_length
  CHECK (rfid_tag ~ '^[A-Za-z0-9]{8,15}$');

DO $$
DECLARE
  account RECORD;
  candidate VARCHAR(8);
BEGIN
  FOR account IN
    SELECT id FROM users
    WHERE role = 'cooperative_admin' AND farm_id IS NULL
  LOOP
    LOOP
      candidate := UPPER(SUBSTRING(MD5(RANDOM()::text || CLOCK_TIMESTAMP()::text) FROM 1 FOR 8));
      BEGIN
        UPDATE users SET farm_id = candidate, updated_at = now()
         WHERE id = account.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
  END LOOP;
END $$;