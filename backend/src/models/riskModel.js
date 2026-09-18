/** Data-access layer for risk_history, quarter_readings, recommendations, herd_events. */
const { query } = require('../config/db');

async function insertRiskHistory(animalId, { riskScore, riskLevel, source = 'rule_engine' }) {
  const { rows } = await query(
    `INSERT INTO risk_history (animal_id, risk_score, risk_level, source)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [animalId, riskScore, riskLevel, source]
  );
  return rows[0];
}

async function upsertQuarterReading(animalId, quarter, { ecDeltaPct, tempDeltaC, yieldDropPct }) {
  const { rows } = await query(
    `INSERT INTO quarter_readings (animal_id, quarter, ec_delta_pct, temp_delta_c, yield_drop_pct)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [animalId, quarter, ecDeltaPct, tempDeltaC, yieldDropPct]
  );
  return rows[0];
}

async function listRecommendations({ ownerId = null, animalId = null } = {}) {
  const clauses = [];
  const params = [];
  if (ownerId) { params.push(ownerId); clauses.push(`br.owner_id = $${params.length}`); }
  if (animalId) { params.push(animalId); clauses.push(`r.animal_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT r.*, br.display_tag, br.name
       FROM recommendations r
       JOIN bovine_registry br ON br.id = r.animal_id
       ${where}
      ORDER BY r.created_at DESC`,
    params
  );
  return rows;
}

async function createRecommendation({ animalId, profile, action, urgency, issuedBy = null }) {
  const { rows } = await query(
    `INSERT INTO recommendations (animal_id, profile, action, urgency, issued_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [animalId, profile, action, urgency, issuedBy]
  );
  return rows[0];
}

async function listHerdEvents({ ownerId = null, limit = 100 } = {}) {
  const { rows } = await query(
    `SELECT he.*, br.display_tag, br.name
       FROM herd_events he
       JOIN bovine_registry br ON br.id = he.animal_id
      WHERE ($1::uuid IS NULL OR br.owner_id = $1)
      ORDER BY he.event_date DESC
      LIMIT $2`,
    [ownerId, limit]
  );
  return rows;
}

async function createHerdEvent({ animalId, eventText, eventDate = null }) {
  const { rows } = await query(
    `INSERT INTO herd_events (animal_id, event_text, event_date)
     VALUES ($1,$2, COALESCE($3, now())) RETURNING *`,
    [animalId, eventText, eventDate]
  );
  return rows[0];
}

module.exports = {
  insertRiskHistory,
  upsertQuarterReading,
  listRecommendations,
  createRecommendation,
  listHerdEvents,
  createHerdEvent,
};
