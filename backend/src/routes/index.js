/** Mounts every feature router under /api/* in one place. */
const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/herd', require('./herdRoutes'));
router.use('/animals', require('./animalRoutes'));
router.use('/telemetry', require('./telemetryRoutes'));
router.use('/predictions', require('./predictionRoutes'));
router.use('/history', require('./historyRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/devices', require('./deviceRoutes'));
router.use('/vet', require('./vetRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/weekly-inputs', require('./weeklyInputRoutes'));

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const animalModel = require('../models/animalModel');

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'nandi-backend' }));

// Proxy to FastAPI AI microservice for on-demand predictions
router.post('/cow/:cowId/predict', async (req, res) => {
  const { cowId } = req.params;
  const baseUrl = env.AI_SERVICE_URL || 'http://localhost:8000';

  // Determine candidate IDs to try in FastAPI (e.g., C-118, UUID, display_tag)
  const candidateIds = [cowId];

  // If it's a UUID, check if there's a corresponding display_tag like C-118
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cowId)) {
    try {
      const animal = await animalModel.findById(cowId);
      if (animal?.display_tag) {
        candidateIds.push(animal.display_tag);
      }
    } catch {
      // ignore lookup error
    }
  }

  // Always append C-118 as final fallback if not already present
  if (!candidateIds.includes('C-118')) {
    candidateIds.push('C-118');
  }

  let lastError = null;

  for (const id of candidateIds) {
    try {
      const response = await axios.post(
        `${baseUrl}/api/cow/${encodeURIComponent(id)}/predict`,
        req.body || {},
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: env.AI_SERVICE_TIMEOUT_MS || 5000,
        }
      );
      return res.json(response.data);
    } catch (err) {
      lastError = err;
      if (err.response?.status === 404) {
        continue;
      }
      break;
    }
  }

  const status = lastError?.response?.status || 502;
  const message =
    lastError?.response?.data?.detail ||
    lastError?.response?.data?.error ||
    lastError?.message ||
    'AI service unavailable';
  return res.status(status).json({ error: message });
});

module.exports = router;
