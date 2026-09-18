/** Data-access layer for `sensor_telemetry` (the IoT time-series table). */
const { query } = require('../config/db');

async function insert(reading) {
  const { rows } = await query(
    `INSERT INTO sensor_telemetry
       (animal_id, device_id, device_type, quarter, ec, ph, viscosity_torque,
        milk_yield, rumination, skin_temp, recorded_at, raw_payload, spot_check_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11, now()), $12, $13)
     RETURNING *`,
    [
      reading.animal_id,
      reading.device_id,
      reading.device_type,
      reading.quarter || null,
      reading.ec ?? null,
      reading.ph ?? null,
      reading.viscosity_torque ?? null,
      reading.milk_yield ?? null,
      reading.rumination ?? null,
      reading.skin_temp ?? null,
      reading.recorded_at || null,
      reading.raw_payload || null,
      reading.spot_check_id || null,
    ]
  );
  return rows[0];
}

async function latestForAnimal(animalId, limit = 20) {
  const { rows } = await query(
    `SELECT * FROM sensor_telemetry
      WHERE animal_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2`,
    [animalId, limit]
  );
  return rows;
}

async function latestByQuarter(animalId, limit = 100) {
  const { rows } = await query(
    `SELECT DISTINCT ON (quarter) *
       FROM sensor_telemetry
      WHERE animal_id = $1 AND quarter IS NOT NULL
      ORDER BY quarter, recorded_at DESC
      LIMIT $2`,
    [animalId, limit]
  );
  return rows;
}

async function recentForHerd({ ownerId, limit = 100 } = {}) {
  const { rows } = await query(
    `SELECT st.*, br.display_tag, br.name
       FROM sensor_telemetry st
       JOIN bovine_registry br ON br.id = st.animal_id
      WHERE ($1::uuid IS NULL OR br.owner_id = $1)
      ORDER BY st.recorded_at DESC
      LIMIT $2`,
    [ownerId, limit]
  );
  return rows;
}

module.exports = { insert, latestForAnimal, latestByQuarter, recentForHerd };
