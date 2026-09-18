const express = require('express');
const { getAnimalDetail, getAnimalTelemetry, removeAnimal } = require('../controllers/animalController');
const { protect, requireApprovedVet } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireApprovedVet);

router.get('/:id', getAnimalDetail);              // GET /api/animals/:id            -> AnimalDetailPage
router.get('/:id/telemetry', getAnimalTelemetry);  // GET /api/animals/:id/telemetry  -> AnimalDetailPage charts
router.delete('/:id', removeAnimal);               // DELETE /api/animals/:id          -> soft-remove from herd

module.exports = router;
