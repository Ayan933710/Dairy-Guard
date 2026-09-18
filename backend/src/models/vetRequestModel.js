const { query } = require('../config/db');

async function create(vetId, requestedDistrict) {
  const { rows } = await query(
    `INSERT INTO vet_district_requests (vet_id, requested_district)
     VALUES ($1, $2)
     RETURNING *`,
    [vetId, requestedDistrict]
  );
  return rows[0];
}

async function findPendingByVet(vetId) {
  const { rows } = await query(
    `SELECT * FROM vet_district_requests
      WHERE vet_id = $1 AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1`,
    [vetId]
  );
  return rows[0] || null;
}

async function listPending() {
  const { rows } = await query(
    `SELECT r.id, r.requested_district, r.status, r.created_at,
            u.id AS vet_id, u.full_name, u.email, u.phone, u.registration_number,
            u.vet_state
       FROM vet_district_requests r
       JOIN users u ON u.id = r.vet_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC`
  );
  return rows;
}

async function approve(requestId, reviewerId) {
  const { rows } = await query(
    `UPDATE vet_district_requests AS r
        SET status = 'approved', reviewed_by = $2, reviewed_at = now()
      WHERE r.id = $1 AND r.status = 'pending'
      RETURNING r.*`,
    [requestId, reviewerId]
  );
  return rows[0] || null;
}

async function reject(requestId, reviewerId) {
  const { rows } = await query(
    `UPDATE vet_district_requests AS r
        SET status = 'rejected', reviewed_by = $2, reviewed_at = now()
      WHERE r.id = $1 AND r.status = 'pending'
      RETURNING r.*`,
    [requestId, reviewerId]
  );
  return rows[0] || null;
}

module.exports = { create, findPendingByVet, listPending, approve, reject };
