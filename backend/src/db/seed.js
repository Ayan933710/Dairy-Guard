/**
 * Seeds the database with demo users and a demo herd that mirrors the
 * shape of the frontend's mock data (src/data/herd.js) so the UI looks
 * populated immediately after `npm run seed`, before any real ESP32
 * hardware or the Python AI service are connected.
 *
 * Usage: npm run seed
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateFarmId } = require('../models/userModel');
const env = require('../config/env');

const DEMO_PASSWORD = 'Password123!';

const USERS = [
  { full_name: 'Ramesh Patel', email: 'farmer@nandi.test', phone: '+919800000001', role: 'farmer', farm_name: 'Patel Dairy Farm', farm_state: 'West Bengal', farm_district: 'Nadia', hub_latitude: 23.4710, hub_longitude: 88.5565 },
  { full_name: 'Dr. Anjali Rao', email: 'vet@nandi.test', phone: '+919800000002', role: 'vet', farm_name: null, vet_state: 'West Bengal', vet_district: 'Nadia', registration_number: 'WB-VET-2048' },
  { full_name: 'Kolkata Milk Cooperative', email: 'coop@nandi.test', phone: '+919800000003', role: 'cooperative_admin', farm_name: null },
];

// Animal identity only — NO fake sensor data. Real values come from hardware.
const HERD = [
  { display_tag: 'C-104', rfid: '900000000000104', name: 'Gauri', species: 'cow', breed: 'Sahiwal Cross', age: 5, lactation: 3 },
  { display_tag: 'C-118', rfid: '900000000000118', name: 'Radha', species: 'cow', breed: 'Gir', age: 4, lactation: 2 },
  { display_tag: 'C-129', rfid: '900000000000129', name: 'Lakshmi', species: 'cow', breed: 'Crossbred HF', age: 6, lactation: 4 },
  { display_tag: 'B-021', rfid: '900000000000021', name: 'Kajal', species: 'buffalo', breed: 'Murrah', age: 7, lactation: 5 },
  { display_tag: 'B-034', rfid: '900000000000034', name: 'Kali', species: 'buffalo', breed: 'Mehsana', age: 5, lactation: 3 },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[seed] clearing existing demo data...');
    await client.query('BEGIN');
    await client.query('TRUNCATE herd_events, recommendations, quarter_readings, risk_history, amr_history, sensor_telemetry, devices, bovine_registry RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM users WHERE email LIKE $1 OR email LIKE $2', ['%@nandi.test', '%@dairyguard.test']);

    console.log('[seed] creating demo users...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_SALT_ROUNDS);
    const userIds = {};
    const farmIds = {};
    for (const u of USERS) {
      const farmId = u.role === 'farmer' ? 'FARM0001' : null;
      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, phone, farm_name, farm_id,
                           vet_state, vet_district, registration_number, farm_state, farm_district,
                           hub_latitude, hub_longitude)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, role, farm_id`,
        [u.full_name, u.email, passwordHash, u.role, u.phone, u.farm_name, farmId,
          u.vet_state || null, u.vet_district || null, u.registration_number || null,
          u.farm_state || null, u.farm_district || null, u.hub_latitude || null, u.hub_longitude || null]
      );
      userIds[u.role] = rows[0].id;
      farmIds[u.role] = rows[0].farm_id;
    }
    const farmerId = userIds.farmer;

    console.log('[seed] updating main administrator password...');
    if (env.ADMIN_PASSWORD) {
      const adminHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_SALT_ROUNDS);
      await client.query(
        `UPDATE users SET password_hash = $1 WHERE email = 'harshkumar56367@gmail.com'`,
        [adminHash]
      );
    } else {
      console.warn('[seed] WARNING: ADMIN_PASSWORD is not set in .env. Admin account will remain locked.');
    }

    console.log('[seed] registering herd (no fake sensor data — values come from hardware)...');
    for (const a of HERD) {
      const { rows } = await client.query(
        `INSERT INTO bovine_registry
           (display_tag, rfid_tag, name, species, breed, age, lactation_number, owner_id,
             current_risk_level, current_risk_score, rumination_delta_pct, thi,
             current_mastitis_status, current_amr_status, current_amr_score)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
                   NULL, NULL, NULL, NULL, 'clear', 'stable', NULL)
         RETURNING id`,
        [a.display_tag, a.rfid, a.name, a.species, a.breed, a.age, a.lactation, farmerId]
      );
      const animalId = rows[0].id;

      // Register the two field devices for this animal
      await client.query(
        `INSERT INTO devices (id, device_type, animal_id, owner_id, label, last_seen_at)
         VALUES ($1,'collar',$2,$3,$4, now())`,
        [`COLLAR-${a.display_tag}`, animalId, farmerId, `${a.name}'s Smart Collar`]
      );
      await client.query(
        `INSERT INTO devices (id, device_type, animal_id, owner_id, label, last_seen_at)
         VALUES ($1,'cup',$2,$3,$4, now())`,
        [`CUP-${a.display_tag}`, animalId, farmerId, `${a.name}'s Smart Cup`]
      );
    }

    // No fake recommendations or history events — these will be generated
    // automatically by the backend when real hardware data arrives.

    await client.query('COMMIT');
    console.log('\n[seed] Done! Demo accounts (all use password: %s):', DEMO_PASSWORD);
    USERS.forEach((u) => console.log(`  - ${u.role.padEnd(18)} ${u.email}  (Farm ID: ${farmIds[u.role]})`));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
