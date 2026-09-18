const { query } = require('../config/db');

async function insertRun({
  animalId,
  modelVersion,
  probability,
  riskCategory,
  pattern,
  pathogenHint,
  affectedQuarters,
  inputSnapshot,
  quarterResults,
}) {
  const client = await require('../config/db').pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO prediction_runs
        (animal_id, model_version, mastitis_probability, risk_category, pattern,
         pathogen_hint, affected_quarters, input_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)
       RETURNING *`,
      [animalId, modelVersion, probability, riskCategory, pattern || null, pathogenHint || null,
        JSON.stringify(affectedQuarters || []), JSON.stringify(inputSnapshot || {})]
    );
    for (const result of quarterResults || []) {
      await client.query(
        `INSERT INTO prediction_quarter_results
          (prediction_run_id, quarter, mastitis_probability, confidence, risk_category)
         VALUES ($1,$2,$3,$4,$5)`,
        [rows[0].id, result.quarter, result.mastitis_probability, result.confidence, result.risk_category]
      );
    }
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function latestForAnimal(animalId) {
  const { rows } = await query(
    `SELECT pr.*, COALESCE(json_agg(
       json_build_object(
         'quarter', pqr.quarter,
         'mastitis_probability', pqr.mastitis_probability,
         'confidence', pqr.confidence,
         'risk_category', pqr.risk_category
       ) ORDER BY pqr.quarter
     ) FILTER (WHERE pqr.id IS NOT NULL), '[]') AS quarter_results
       FROM prediction_runs pr
       LEFT JOIN prediction_quarter_results pqr ON pqr.prediction_run_id = pr.id
      WHERE pr.animal_id = $1
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
      LIMIT 1`,
    [animalId]
  );
  return rows[0] || null;
}

module.exports = { insertRun, latestForAnimal };