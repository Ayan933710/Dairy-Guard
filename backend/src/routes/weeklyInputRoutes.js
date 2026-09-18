const express = require('express');
const { listWeeklyInputs, saveWeeklyInput } = require('../controllers/weeklyInputController');
const { protect, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, requireRole('farmer'));
router.get('/', listWeeklyInputs);
router.post('/', saveWeeklyInput);
module.exports = router;