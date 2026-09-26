const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const auditModel = require('../models/auditModel');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, me);
router.put('/me', protect, updateProfile);
router.post('/logout', protect, async (req, res) => {
	await auditModel.record({ actorId: req.user.id, action: 'user_logged_out', entityType: 'user', entityId: req.user.id, details: {} });
	res.json({ ok: true });
});

module.exports = router;
