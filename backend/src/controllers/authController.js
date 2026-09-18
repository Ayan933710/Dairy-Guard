/** Registration, login, and "who am I" for the AuthPage.jsx frontend flow. */
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const vetRequestModel = require('../models/vetRequestModel');

const VALID_ROLES = ['farmer', 'vet', 'cooperative_admin'];

const register = asyncHandler(async (req, res) => {
  const { full_name, email, password, role = 'farmer', phone, farm_name,
    vet_state, vet_district, registration_number, farm_state, farm_district,
    hub_latitude, hub_longitude } = req.body;

  const normalizedEmail = email?.trim().toLowerCase() || null;
  const { preferred_language = 'en' } = req.body;
  if (!full_name || !password || !phone) {
    return res.status(400).json({ error: 'full_name, phone and password are required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (role === 'vet' && (!vet_state || !vet_district || !registration_number)) {
    return res.status(400).json({ error: 'vet_state, vet_district and registration_number are required for Vet accounts.' });
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

  const token = signToken(user);
  res.status(201).json({ token, user });
});

const login = asyncHandler(async (req, res) => {
  // Vets use registration_number; the same lookup also preserves existing farmer logins.
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
  res.json({ token, user });
});

const me = asyncHandler(async (req, res) => {
  // req.user is populated by the `protect` middleware
  res.json({ user: req.user });
});

module.exports = { register, login, me };
