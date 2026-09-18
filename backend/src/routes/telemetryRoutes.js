const express = require('express');
const { ingest, spotCheck, recent } = require('../controllers/telemetryController');
const { protect, requireApprovedVet, verifyDeviceKey } = require('../middleware/authMiddleware');

const router = express.Router();

// ESP32-S3 devices call this directly over HTTP with the shared device key
// (no user login). Body shape documented in services/telemetryIngestService.js
router.post('/ingest', verifyDeviceKey, ingest);
router.post('/spot-check', verifyDeviceKey, spotCheck);

// Dashboard clients (JWT-authenticated) browsing recent raw readings
router.get('/recent', protect, requireApprovedVet, recent);

module.exports = router;
