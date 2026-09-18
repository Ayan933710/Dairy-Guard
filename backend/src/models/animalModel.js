/** Data-access layer for `bovine_registry` and its related sub-resources. */
const { query } = require('../config/db');

async function create(data) {
  const { rows } = await query(
    `INSERT INTO bovine_registry
       (display_tag, rfid_tag, name, species, breed, age, lactation_number, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [data.display_tag, data.rfid_tag, data.name, data.species, data.breed, data.age, data.lactation_number, data.owner_id]
  );
  return rows[0];
}

/** List animals, optionally scoped to an owner (farmers only see their own herd) and/or species. */
async function list({ ownerId = null, species = null } = {}) {
  const clauses = ['is_active = TRUE'];
  const params = [];

  if (ownerId) {
    params.push(ownerId);
    clauses.push(`owner_id = $${params.length}`);
  }
  if (species) {
    params.push(species);
    clauses.push(`species = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT * FROM bovine_registry WHERE ${clauses.join(' AND ')} ORDER BY current_risk_score DESC, name ASC`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM bovine_registry WHERE id = $1', [id]);
  return rows[0] || null;
}

async function remove(animalId, ownerId) {
  const { rows } = await query(
    `UPDATE bovine_registry SET is_active = FALSE, updated_at = now()
      WHERE id = $1 AND owner_id = $2 AND is_active = TRUE RETURNING *`,
    [animalId, ownerId]
  );
  return rows[0] || null;
}

async function removeById(animalId) {
  const { rows } = await query(
    `UPDATE bovine_registry SET is_active = FALSE, updated_at = now()
      WHERE id = $1 AND is_active = TRUE RETURNING *`,
    [animalId]
  );
  return rows[0] || null;
}

async function findByDisplayTag(tag) {
  const { rows } = await query('SELECT * FROM bovine_registry WHERE display_tag = $1', [tag]);
  return rows[0] || null;
}

async function findByRfid(rfid) {
  const { rows } = await query('SELECT * FROM bovine_registry WHERE rfid_tag = $1', [rfid]);
  return rows[0] || null;
}

async function updateRiskSnapshot(animalId, { riskLevel, riskScore, ruminationDeltaPct, thi }) {
  const { rows } = await query(
    `UPDATE bovine_registry
        SET current_risk_level = $2,
            current_risk_score = $3,
            rumination_delta_pct = COALESCE($4, rumination_delta_pct),
            thi = COALESCE($5, thi),
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [animalId, riskLevel, riskScore, ruminationDeltaPct, thi]
  );
  return rows[0];
}

async function getQuarters(animalId) {
  const { rows } = await query(
    `SELECT DISTINCT ON (quarter) quarter, ec_delta_pct, temp_delta_c, yield_drop_pct, recorded_at
       FROM quarter_readings
      WHERE animal_id = $1
      ORDER BY quarter, recorded_at DESC`,
    [animalId]
  );
  return rows;
}

async function getTrend(animalId, days = 30) {
  const { rows } = await query(
    `SELECT risk_score, risk_level, recorded_at
       FROM risk_history
      WHERE animal_id = $1 AND recorded_at >= now() - ($2 || ' days')::interval
      ORDER BY recorded_at ASC`,
    [animalId, days]
  );
  return rows;
}

module.exports = {
  create,
  list,
  findById,
  remove,
  removeById,
  findByDisplayTag,
  findByRfid,
  updateRiskSnapshot,
  getQuarters,
  getTrend,
};
