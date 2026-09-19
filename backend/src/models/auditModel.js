const { query } = require('../config/db');

async function record({ actorId = null, action, entityType, entityId = null, details = {} }) {
  const { rows } = await query(
    `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [actorId, action, entityType, entityId, JSON.stringify(details)]
  );
  return rows[0];
}

async function list(limit = 200) {
  const { rows } = await query(
    `SELECT ae.*, u.full_name AS actor_name, u.email AS actor_email, u.role AS actor_role
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_id
      ORDER BY ae.created_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { record, list };
