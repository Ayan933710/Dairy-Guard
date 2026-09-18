const express = require('express');
const { listHistory, createHistoryEvent } = require('../controllers/historyController');
const { protect, requireApprovedVet } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireApprovedVet);

router.get('/', listHistory);          // GET  /api/history -> HistoryPage
router.post('/', createHistoryEvent);  // POST /api/history -> log a manual event

module.exports = router;
