const { query } = require('../config/db');

async function findById(deviceId) {
  const { rows } = await query('SELECT * FROM devices WHERE id = $1', [deviceId]);
  return rows[0] || null;
}

async function upsertLastSeen(deviceId, { batteryPct } = {}) {
  const { rows } = await query(
    `UPDATE devices SET last_seen_at = now(), battery_pct = COALESCE($2, battery_pct)
      WHERE id = $1 RETURNING *`,
    [deviceId, batteryPct ?? null]
  );
  return rows[0] || null;
}

async function register({ id, deviceType, animalId, ownerId, label }) {
  const { rows } = await query(
    `INSERT INTO devices (id, device_type, animal_id, owner_id, label)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET animal_id = EXCLUDED.animal_id, label = EXCLUDED.label
     RETURNING *`,
    [id, deviceType, animalId, ownerId, label || null]
  );
  return rows[0];
}

async function listByOwner(ownerId) {
  const { rows } = await query(
    `SELECT d.*, br.display_tag, br.name
       FROM devices d
       LEFT JOIN bovine_registry br ON br.id = d.animal_id
      WHERE d.owner_id = $1
      ORDER BY d.last_seen_at DESC NULLS LAST`,
    [ownerId]
  );
  return rows;
}

module.exports = { findById, upsertLastSeen, register, listByOwner };
