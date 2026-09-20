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

// Mirrors src/data/herd.js on the frontend, plus a synthetic 15-digit RFID tag per animal.
const HERD = [
  { display_tag: 'C-104', rfid: '900000000000104', name: 'Gauri', species: 'cow', breed: 'Sahiwal Cross', age: 5, lactation: 3, risk: 'High Risk', score: 84, rumination: -28, thi: 78 },
  { display_tag: 'C-118', rfid: '900000000000118', name: 'Radha', species: 'cow', breed: 'Gir', age: 4, lactation: 2, risk: 'Moderate Risk', score: 58, rumination: -12, thi: 71 },
  { display_tag: 'C-129', rfid: '900000000000129', name: 'Lakshmi', species: 'cow', breed: 'Crossbred HF', age: 6, lactation: 4, risk: 'No Risk', score: 9, rumination: 2, thi: 62 },
  { display_tag: 'B-021', rfid: '900000000000021', name: 'Kajal', species: 'buffalo', breed: 'Murrah', age: 7, lactation: 5, risk: 'Low Risk', score: 32, rumination: -6, thi: 69 },
  { display_tag: 'B-034', rfid: '900000000000034', name: 'Kali', species: 'buffalo', breed: 'Mehsana', age: 5, lactation: 3, risk: 'No Risk', score: 6, rumination: 1, thi: 64 },
];

const QUARTERS = ['LF', 'RF', 'LR', 'RR']; // cows and buffaloes both have 4 mammary quarters

function randDelta(base) {
  return +(base + Math.random() * 4).toFixed(2);
}

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
      const farmId = u.role === 'farmer' ? generateFarmId() : null;
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

    console.log('[seed] creating demo herd...');
    for (const a of HERD) {
      const { rows } = await client.query(
        `INSERT INTO bovine_registry
           (display_tag, rfid_tag, name, species, breed, age, lactation_number, owner_id,
             current_risk_level, current_risk_score, rumination_delta_pct, thi,
             current_mastitis_status, current_amr_status, current_amr_score)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [a.display_tag, a.rfid, a.name, a.species, a.breed, a.age, a.lactation, farmerId,
            a.risk, a.score, a.rumination, a.thi, a.risk === 'High Risk' ? 'high' : 'clear', a.risk === 'High Risk' ? 'rising' : 'stable', a.risk === 'High Risk' ? 68 : 12]
      );
      const animalId = rows[0].id;

      // Quarter-level deltas (udder diagram) - 4 mammary quarters per animal
      for (const q of QUARTERS) {
        const isHotspot = a.risk === 'High Risk' && q === 'LF';
        await client.query(
          `INSERT INTO quarter_readings (animal_id, quarter, ec_delta_pct, temp_delta_c, yield_drop_pct)
           VALUES ($1,$2,$3,$4,$5)`,
          [animalId, q, isHotspot ? 22 : randDelta(4), isHotspot ? 0.9 : +(Math.random() * 0.3).toFixed(2), isHotspot ? 15 : Math.round(Math.random() * 5)]
        );
      }

      // 30-day risk score trend
      let v = 20 + Math.random() * 10;
      const driftUp = a.risk === 'High Risk' || a.risk === 'Moderate Risk';
      for (let i = 30; i >= 1; i -= 1) {
        v += (driftUp ? 1 : -0.3) * (Math.random() * 2);
        const score = Math.max(2, Math.min(96, Math.round(v)));
        await client.query(
          `INSERT INTO risk_history (animal_id, risk_score, risk_level, source, recorded_at)
           VALUES ($1,$2,$3,'seed_data', now() - ($4 || ' days')::interval)`,
          [animalId, score, a.risk, i]
        );
      }

      await client.query(
        `INSERT INTO amr_history (animal_id, amr_score, amr_status, recorded_at)
         VALUES ($1,$2,$3, now() - interval '1 year'), ($1,$4,$5, now())`,
        [animalId, a.risk === 'High Risk' ? 48 : 8, a.risk === 'High Risk' ? 'rising' : 'stable',
          a.risk === 'High Risk' ? 68 : 12, a.risk === 'High Risk' ? 'rising' : 'stable']
      );

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

    console.log('[seed] creating recommendations...');
    const recs = [
      { tag: 'C-104', profile: 'Acute / Environmental', action: 'Immediate veterinary examination; supportive anti-inflammatory therapy; replace bedding in this stall.', urgency: 'High Risk' },
      { tag: 'C-118', profile: 'Subclinical / Contagious', action: "Post-milking chlorhexidine teat dip; milk this cow last to avoid cross-transmission via the milker's hands.", urgency: 'Moderate Risk' },
      { tag: 'B-021', profile: 'Heat-stress linked', action: 'Increase shed ventilation; shift milking to early morning while THI is elevated.', urgency: 'Moderate Risk' },
    ];
    for (const r of recs) {
      const { rows } = await client.query('SELECT id FROM bovine_registry WHERE display_tag = $1', [r.tag]);
      await client.query(
        `INSERT INTO recommendations (animal_id, profile, action, urgency) VALUES ($1,$2,$3,$4)`,
        [rows[0].id, r.profile, r.action, r.urgency]
      );
    }

    console.log('[seed] creating history log events...');
    const events = [
      { tag: 'C-104', date: '2026-08-30', text: 'Risk escalated to High Risk (84%)' },
      { tag: 'C-104', date: '2026-08-28', text: 'Quarter 3 EC delta crossed +18% threshold' },
      { tag: 'C-118', date: '2026-08-27', text: 'Rumination declined 12% over 48h' },
      { tag: 'B-021', date: '2026-08-25', text: 'THI exceeded 70 for 3 consecutive days' },
      { tag: 'B-021', date: '2026-08-20', text: 'Monthly probe calibration completed' },
      { tag: 'C-129', date: '2026-08-14', text: 'Clear CMT result, herd baseline updated' },
    ];
    for (const e of events) {
      const { rows } = await client.query('SELECT id FROM bovine_registry WHERE display_tag = $1', [e.tag]);
      await client.query(
        `INSERT INTO herd_events (animal_id, event_text, event_date) VALUES ($1,$2,$3)`,
        [rows[0].id, e.text, e.date]
      );
    }

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
