-- Main administrator account.
-- The password is set via the seed script (npm run seed) using bcrypt,
-- NOT hardcoded here. This migration only ensures the row exists with
-- a locked-out placeholder hash that cannot be used to log in.
-- After running migrations, run: npm run seed  (or manually update the password).
INSERT INTO users (full_name, email, password_hash, role, phone, farm_name, vet_approval_status)
VALUES (
  'NANDI Main Administrator',
  'harshkumar56367@gmail.com',
  '$2a$10$PLACEHOLDER_HASH_RUN_SEED_SCRIPT_TO_SET_REAL_PASSWORD',
  'administrator',
  NULL,
  NULL,
  'approved'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = 'administrator',
  is_active = TRUE,
  vet_approval_status = 'approved',
  updated_at = now();