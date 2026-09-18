const express = require('express');
const { protect, requireApprovedVet, requireRole } = require('../middleware/authMiddleware');
const { getDashboard } = require('../controllers/vetController');
const { createRequest, listPendingRequests, approveRequest } = require('../controllers/vetRequestController');

const router = express.Router();
router.get('/dashboard', protect, requireRole('vet'), requireApprovedVet, getDashboard);
router.post('/district-requests', protect, requireRole('vet'), createRequest);
router.get('/district-requests', protect, requireRole('cooperative_admin', 'administrator'), listPendingRequests);
router.patch('/district-requests/:requestId/approve', protect, requireRole('cooperative_admin', 'administrator'), approveRequest);

module.exports = router;