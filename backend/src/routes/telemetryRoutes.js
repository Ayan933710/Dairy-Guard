const express = require('express');
const { ingest, spotCheck, recent } = require('../controllers/telemetryController');
const { protect, requireApprovedVet, verifyDeviceKey } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/ingest', verifyDeviceKey, ingest);
router.post('/spot-check', verifyDeviceKey, spotCheck);

router.get('/recent', protect, requireApprovedVet, recent);

module.exports = router;
