const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const vetRequestModel = require('../models/vetRequestModel');
const auditModel = require('../models/auditModel');

const VALID_ROLES = ['farmer', 'vet', 'cooperative_admin'];

const register = asyncHandler(async (req, res) => {
  const { full_name, email, password, role = 'farmer', phone, farm_name,
    vet_state, vet_district, vet_designation, registration_number, farm_state, farm_district,
    hub_latitude, hub_longitude } = req.body;

  const normalizedEmail = email?.trim().toLowerCase() || null;
  const { preferred_language = 'en' } = req.body;
  if (!full_name || !password || !phone) {
    return res.status(400).json({ error: 'full_name, phone and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (role === 'vet' && (!vet_state || !vet_district || !vet_designation || !registration_number)) {
    return res.status(400).json({ error: 'vet_state, vet_district, vet_designation and registration_number are required for Vet accounts.' });
  }

  if (!['en', 'hi', 'kn'].includes(preferred_language)) {
    return res.status(400).json({ error: 'preferred_language must be en, hi, or kn.' });
  }
  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const password_hash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  const user = await userModel.create({
    full_name,
    email: normalizedEmail,
    password_hash,
    role,
    phone,
    farm_name,
    vet_state,
    vet_district,
    vet_designation,
    registration_number,
    preferred_language,
    farm_state,
    farm_district,
    hub_latitude,
    hub_longitude,
    vet_approval_status: role === 'vet' ? 'pending' : 'approved',
  });

  if (role === 'vet') {
    await vetRequestModel.create(user.id, vet_district.trim());
  }

  await auditModel.record({ actorId: user.id, action: 'account_created', entityType: 'user', entityId: user.id, details: { role, full_name } });

  const token = signToken(user);
  res.status(201).json({ token, user });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const lookupValue = identifier || email; // `email` kept for backward compatibility

  if (!lookupValue || !password) {
    return res.status(400).json({ error: 'identifier (email, phone, farm ID, or Vet registration number) and password are required.' });
  }

  const user = await userModel.findByIdentifier(lookupValue.trim());
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signToken(user);
  delete user.password_hash;
  await auditModel.record({ actorId: user.id, action: 'user_logged_in', entityType: 'user', entityId: user.id, details: { role: user.role } });
  res.json({ token, user });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, phone, farm_name, vet_designation, vet_district } = req.body;
  const user = await userModel.findByIdentifier(req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const updatedUser = await userModel.updateProfile(user.id, { full_name, phone, farm_name, vet_designation, vet_district });
  res.json({ user: updatedUser });
});

module.exports = { register, login, me, updateProfile };
