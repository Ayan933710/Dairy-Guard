const express = require('express');
const { getSummary } = require('../controllers/analyticsController');
const { protect, requireApprovedVet } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, requireApprovedVet, getSummary); // GET /api/analytics/summary -> AnalyticsPage

module.exports = router;
