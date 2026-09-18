const express = require('express');
const { listHerd, listBySpecies, registerAnimal } = require('../controllers/herdController');
const { protect, requireApprovedVet, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireApprovedVet);

router.get('/', listHerd);                          // GET /api/herd            -> HerdOverviewPage
router.get('/species/:species', listBySpecies);      // GET /api/herd/species/:s -> SpeciesListPage
router.post('/', requireRole('farmer', 'cooperative_admin', 'administrator'), registerAnimal); // add a new animal to the registry

module.exports = router;
