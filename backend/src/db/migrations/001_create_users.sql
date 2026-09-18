-- ============================================================
-- 001_create_users.sql
-- Users table: credentials + Role-Based Access Control (RBAC)
-- Roles map to the three personas in the DairyGuard frontend:
--   farmer          - owns/manages animals in their own herd
--   vet             - can view & annotate any herd, issue recommendations
--   cooperative_admin - oversees multiple farmers under a cooperative
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer', 'vet', 'cooperative_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR(120)  NOT NULL,
  email           VARCHAR(160)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  role            user_role     NOT NULL DEFAULT 'farmer',
  phone           VARCHAR(20),
  farm_name       VARCHAR(160),
  cooperative_id  UUID          NULL, -- self-referential grouping for coop admins, nullable
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
