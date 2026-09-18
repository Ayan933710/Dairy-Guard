INSERT INTO users (full_name, email, password_hash, role, phone, farm_name, vet_approval_status)
VALUES (
  'DairyGuard Main Administrator',
  'harshkumar56367@gmail.com',
  crypt('Abcd@1234', gen_salt('bf', 10)),
  'administrator',
  NULL,
  NULL,
  'approved'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = 'administrator',
  is_active = TRUE,
  vet_approval_status = 'approved',
  updated_at = now();