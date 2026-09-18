const express = require('express');
const { listDevices, registerDevice } = require('../controllers/deviceController');
const { protect, requireApprovedVet } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireApprovedVet);

router.get('/', listDevices);
router.post('/', registerDevice);

module.exports = router;
