ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vet_approval_status VARCHAR(20) NOT NULL DEFAULT 'approved';

ALTER TABLE users
  ADD CONSTRAINT users_vet_approval_status_check
  CHECK (vet_approval_status IN ('pending', 'approved', 'rejected'));

UPDATE users
   SET vet_approval_status = 'approved'
 WHERE role <> 'vet' AND vet_approval_status <> 'approved';
