const express = require('express');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { getOverview, createAccount, createAnimal, setUserActive, removeUser, listAnimals, removeAnimal } = require('../controllers/adminController');
const { approveRequest, rejectRequest } = require('../controllers/vetRequestController');

const router = express.Router();
router.use(protect, requireRole('administrator'));
router.get('/overview', getOverview);
router.post('/users', createAccount);
router.post('/animals', createAnimal);
router.get('/animals', listAnimals);
router.delete('/animals/:animalId', removeAnimal);
router.patch('/users/:userId/status', setUserActive);
router.delete('/users/:userId', removeUser);
router.patch('/vet-requests/:requestId/approve', approveRequest);
router.patch('/vet-requests/:requestId/reject', rejectRequest);

module.exports = router;