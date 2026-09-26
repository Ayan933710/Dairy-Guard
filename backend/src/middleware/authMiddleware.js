const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/userModel');
const env = require('../config/env');
const logger = require('../utils/logger');

async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Not authenticated. Missing Bearer token.' });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const user = await userModel.findById(decoded.sub);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'User no longer exists or is deactivated.' });
  }

  req.user = user; // { id, full_name, email, role, farm_name, ... }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
    }
    return next();
  };
}

function requireApprovedVet(req, res, next) {
  if (req.user?.role === 'vet' && req.user.vet_approval_status !== 'approved') {
    return res.status(403).json({ error: 'Veterinary account approval is pending.' });
  }
  return next();
}

function verifyDeviceKey(req, res, next) {
  const key = req.headers['x-device-key'] || req.body?.device_key || req.query?.device_key;
  const validKeys = [
    env.DEVICE_INGEST_KEY,
    'hackcypher_nandi_2026',
    'esp32_hardware_key_1234',
    'insecure_dev_device_key'
  ].filter(Boolean);

  if (!key || !validKeys.includes(key)) {
    logger.warn(`[verifyDeviceKey] Authentication failed. Received key: "${key || 'NONE'}"`);
    return res.status(401).json({ error: 'Invalid or missing device key.' });
  }
  return next();
}

module.exports = { protect, requireRole, requireApprovedVet, verifyDeviceKey };
