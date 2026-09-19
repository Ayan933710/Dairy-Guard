const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const auditModel = require('../models/auditModel');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.post('/logout', protect, async (req, res) => {
	await auditModel.record({ actorId: req.user.id, action: 'user_logged_out', entityType: 'user', entityId: req.user.id, details: {} });
	res.json({ ok: true });
});

module.exports = router;
