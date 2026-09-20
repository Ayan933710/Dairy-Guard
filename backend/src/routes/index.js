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

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'nandi-backend' }));

module.exports = router;
