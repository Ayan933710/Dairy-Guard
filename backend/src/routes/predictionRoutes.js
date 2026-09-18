const express = require('express');
const {
  listRecommendations,
  createRecommendation,
  runPrediction,
} = require('../controllers/predictionController');
const { protect, requireApprovedVet, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireApprovedVet);

router.get('/', listRecommendations);                                   // GET  /api/predictions            -> PredictionsPage
router.post('/', requireRole('vet', 'cooperative_admin'), createRecommendation); // vets can log a manual recommendation
router.post('/run/:animalId', runPrediction);                            // POST /api/predictions/run/:id    -> "Run prediction" button

module.exports = router;
