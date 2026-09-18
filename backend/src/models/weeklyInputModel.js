const { query } = require('../config/db');

async function upsert(farmerId, input) {
  const { rows } = await query(
    `INSERT INTO weekly_farmer_inputs
      (farmer_id, week_start, morning_milking_count, evening_milking_count, feed_kg,
       worker_hygiene, antidote_given, antidote_animal_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (farmer_id, week_start) DO UPDATE SET
       morning_milking_count = EXCLUDED.morning_milking_count,
       evening_milking_count = EXCLUDED.evening_milking_count,
       feed_kg = EXCLUDED.feed_kg,
       worker_hygiene = EXCLUDED.worker_hygiene,
       antidote_given = EXCLUDED.antidote_given,
       antidote_animal_id = EXCLUDED.antidote_animal_id
     RETURNING *`,
    [farmerId, input.week_start, input.morning_milking_count, input.evening_milking_count,
      input.feed_kg, input.worker_hygiene, input.antidote_given, input.antidote_animal_id || null]
  );
  return rows[0];
}

async function list(farmerId) {
  const { rows } = await query(
    `SELECT w.*, br.display_tag AS antidote_animal_tag
       FROM weekly_farmer_inputs w
       LEFT JOIN bovine_registry br ON br.id = w.antidote_animal_id
      WHERE w.farmer_id = $1 ORDER BY w.week_start DESC LIMIT 12`,
    [farmerId]
  );
  return rows;
}

module.exports = { upsert, list };