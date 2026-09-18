/** Data-access layer for the `users` table. Plain SQL via the shared pool - no ORM. */
const crypto = require('crypto');
const { query } = require('../config/db');

const PUBLIC_COLUMNS = 'id, full_name, email, role, phone, farm_name, farm_id, cooperative_id, vet_state, vet_district, registration_number, farm_state, farm_district, hub_latitude, hub_longitude, preferred_language, vet_approval_status, is_active, created_at';

/** Short, human-typeable ID (e.g. "K7QX9F2A") shown in the top panel and used by hardware. */
function generateFarmId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I - avoids mis-typing on hardware
  let id = '';
  for (let i = 0; i < 8; i += 1) {
    id += alphabet[crypto.randomInt(alphabet.length)];
  }
  return id;
}

async function create({ full_name, email, password_hash, role, phone, farm_name, vet_state, vet_district, registration_number, farm_state, farm_district, hub_latitude, hub_longitude, preferred_language = 'en', vet_approval_status = 'approved' }) {
  // Generate IDs for both farm owners and cooperative accounts so hardware and
  // the dashboard can identify either account consistently.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { rows } = await query(
        `INSERT INTO users (full_name, email, password_hash, role, phone, farm_name, farm_id,
                           vet_state, vet_district, registration_number, farm_state, farm_district,
                           hub_latitude, hub_longitude, preferred_language, vet_approval_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING ${PUBLIC_COLUMNS}`,
        [full_name, email, password_hash, role, phone, farm_name || null,
          ['farmer', 'cooperative_admin'].includes(role) ? generateFarmId() : null, vet_state || null, vet_district || null,
          registration_number || null, farm_state || null, farm_district || null,
          hub_latitude || null, hub_longitude || null, preferred_language, vet_approval_status]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505' && err.constraint?.includes('farm_id')) continue; // collision - retry with a new one
      throw err;
    }
  }
  throw new Error('Could not generate a unique farm ID - please try registering again.');
}

async function findByEmail(email) {
  if (!email) return null;
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

/** Login can use email, phone, farm ID, or a Vet registration number. */
async function findByIdentifier(identifier) {
  const { rows } = await query(
    'SELECT * FROM users WHERE email = $1 OR phone = $1 OR farm_id = $1 OR registration_number = $1',
    [identifier]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findVetsByDistrict(district) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users
      WHERE role = 'vet' AND is_active = TRUE
        AND LOWER(TRIM(vet_district)) = LOWER(TRIM($1::text))`,
    [district]
  );
  return rows;
}

async function listAll() {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`);
  return rows;
}

async function setActive(userId, isActive) {
  const { rows } = await query(
    `UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1 AND role <> 'administrator' RETURNING ${PUBLIC_COLUMNS}`,
    [userId, isActive]
  );
  return rows[0] || null;
}

async function removeById(userId) {
  const { rows } = await query(
    `DELETE FROM users WHERE id = $1 AND role <> 'administrator' RETURNING ${PUBLIC_COLUMNS}`,
    [userId]
  );
  return rows[0] || null;
}

async function updateHubLocation(userId, latitude, longitude) {
  const { rows } = await query(
    `UPDATE users SET hub_latitude = $2, hub_longitude = $3, updated_at = now()
      WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [userId, latitude, longitude]
  );
  return rows[0] || null;
}

async function updateVetDistrict(userId, district) {
  const { rows } = await query(
    `UPDATE users SET vet_district = $2, vet_approval_status = 'approved', updated_at = now()
      WHERE id = $1 AND role = 'vet' RETURNING ${PUBLIC_COLUMNS}`,
    [userId, district]
  );
  return rows[0] || null;
}

module.exports = { create, findByEmail, findByIdentifier, findById, findVetsByDistrict, listAll, setActive, removeById, updateHubLocation, updateVetDistrict, generateFarmId };
