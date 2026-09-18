CREATE TABLE IF NOT EXISTS vet_district_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_district VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_vet_district_request
  ON vet_district_requests(vet_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vet_district_requests_status
  ON vet_district_requests(status, created_at DESC);
