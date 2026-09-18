const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');
const animalModel = require('../models/animalModel');
const vetRequestModel = require('../models/vetRequestModel');
const env = require('../config/env');

const getOverview = asyncHandler(async (req, res) => {
  const [users, animals, farms, risk, requests, farmRows] = await Promise.all([
    userModel.listAll(),
    query('SELECT COUNT(*)::int AS total FROM bovine_registry WHERE is_active = TRUE'),
    query("SELECT COUNT(*)::int AS total FROM users WHERE role IN ('farmer', 'cooperative_admin') AND is_active = TRUE"),
    query("SELECT COUNT(*)::int AS total FROM bovine_registry WHERE is_active = TRUE AND current_risk_level = 'High Risk'"),
    vetRequestModel.listPending(),
    query(`SELECT u.id, u.full_name, u.email, u.phone, u.role, u.farm_name, u.farm_id,
             u.farm_state, u.farm_district, u.hub_latitude, u.hub_longitude,
             COUNT(br.id)::int AS total_animals
          FROM users u LEFT JOIN bovine_registry br ON br.owner_id = u.id AND br.is_active = TRUE
         WHERE u.role IN ('farmer', 'cooperative_admin')
         GROUP BY u.id ORDER BY u.farm_name NULLS LAST, u.full_name`),
  ]);

  res.json({
    stats: { users: users.length, animals: animals.rows[0].total, farms: farms.rows[0].total, highRiskAnimals: risk.rows[0].total },
    users,
    vets: users.filter((user) => user.role === 'vet'),
    requests,
    farms: farmRows.rows,
  });
});

const createAccount = asyncHandler(async (req, res) => {
  const { full_name, email, password, role, phone, farm_name, farm_state, farm_district, vet_state, vet_district, registration_number } = req.body;
  if (!full_name || !email || !password || !role) return res.status(400).json({ error: 'full_name, email, password and role are required.' });
  if (!['farmer', 'vet', 'cooperative_admin'].includes(role)) return res.status(400).json({ error: 'Only farmer, vet and cooperative_admin accounts can be created here.' });
  if (role === 'vet' && (!vet_state || !vet_district || !registration_number)) return res.status(400).json({ error: 'Vet state, district and registration number are required.' });
  const normalizedEmail = email.trim().toLowerCase();
  if (await userModel.findByEmail(normalizedEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = await userModel.create({
    full_name: full_name.trim(), email: normalizedEmail, password_hash: await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS), role,
    phone: phone || null, farm_name: farm_name || null, farm_state: farm_state || null, farm_district: farm_district || null,
    vet_state: vet_state || null, vet_district: vet_district || null, registration_number: registration_number || null,
    vet_approval_status: role === 'vet' ? 'pending' : 'approved',
  });
  if (role === 'vet') await vetRequestModel.create(user.id, vet_district.trim());
  res.status(201).json({ user });
});

const createAnimal = asyncHandler(async (req, res) => {
  const { owner_id, display_tag, rfid_tag, name, species, breed, age = 0, lactation_number = 0 } = req.body;
  if (!owner_id || !display_tag || !rfid_tag || !name || !species || !breed) return res.status(400).json({ error: 'owner_id, display_tag, rfid_tag, name, species and breed are required.' });
  if (!['cow', 'buffalo'].includes(species) || !/^[A-Za-z0-9]{8,15}$/.test(rfid_tag)) return res.status(400).json({ error: 'Use species cow or buffalo and an 8-15 character alphanumeric RFID tag.' });
  const owner = await userModel.findById(owner_id);
  if (!owner || !['farmer', 'cooperative_admin'].includes(owner.role)) return res.status(400).json({ error: 'Animals must belong to a farmer or co-op account.' });
  const animal = await animalModel.create({ owner_id, display_tag, rfid_tag, name, species, breed, age, lactation_number });
  res.status(201).json({ animal });
});

const setUserActive = asyncHandler(async (req, res) => {
  const user = await userModel.setActive(req.params.userId, req.body.is_active === true);
  if (!user) return res.status(404).json({ error: 'User not found or cannot be changed.' });
  res.json({ user });
});

const removeUser = asyncHandler(async (req, res) => {
  const user = await userModel.removeById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found or the main administrator cannot be removed.' });
  res.json({ user });
});

const listAnimals = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT br.*, u.full_name AS owner_name, u.farm_name
    FROM bovine_registry br JOIN users u ON u.id = br.owner_id
    ORDER BY br.created_at DESC`);
  res.json({ animals: rows });
});

const removeAnimal = asyncHandler(async (req, res) => {
  const animal = await animalModel.removeById(req.params.animalId);
  if (!animal) return res.status(404).json({ error: 'Animal not found or already removed.' });
  res.json({ animal });
});

module.exports = { getOverview, createAccount, createAnimal, setUserActive, removeUser, listAnimals, removeAnimal };