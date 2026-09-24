-- Fix the admin password hash that was left as a placeholder by migration 014.
-- The placeholder hash '$2a$10$PLACEHOLDER_HASH_...' is not a valid bcrypt hash,
-- causing "Illegal salt length: 12 != 16" on login attempts.
-- This sets the admin password to: Admin123!
UPDATE users
SET password_hash = '$2a$10$nTCUuI.OZJQkIJd5y1TFGu6N5cK8i5Wdx3FQ.u57AEgSk6SbiUv4i',
    updated_at = now()
WHERE email = 'harshkumar56367@gmail.com';
