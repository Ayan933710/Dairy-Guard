const animalModel = require('../models/animalModel');
const asyncHandler = require('../utils/asyncHandler');

function ownerScopeFor(user) {
  return user.role === 'farmer' ? user.id : null;
}

const listHerd = asyncHandler(async (req, res) => {
  const animals = await animalModel.list({ ownerId: ownerScopeFor(req.user) });
  res.json({ herd: animals });
});

const listBySpecies = asyncHandler(async (req, res) => {
  const { species } = req.params;
  if (!['cow', 'buffalo'].includes(species)) {
    return res.status(400).json({ error: 'species must be one of: cow, buffalo' });
  }
  const animals = await animalModel.list({ ownerId: ownerScopeFor(req.user), species });
  res.json({ species, herd: animals });
});

const registerAnimal = asyncHandler(async (req, res) => {
  const { display_tag, rfid_tag, name, species, breed, age, lactation_number } = req.body;
  if (!display_tag || !rfid_tag || !name || !species || !breed) {
    return res.status(400).json({ error: 'display_tag, rfid_tag, name, species and breed are required.' });
  }
  if (!['cow', 'buffalo'].includes(species)) {
    return res.status(400).json({ error: 'species must be one of: cow, buffalo' });
  }
  if (!/^[A-Za-z0-9]{8,15}$/.test(rfid_tag)) {
    return res.status(400).json({ error: 'rfid_tag must be 8-15 alphanumeric characters.' });
  }

  const animal = await animalModel.create({
    display_tag,
    rfid_tag,
    name,
    species,
    breed,
    age: age || 0,
    lactation_number: lactation_number || 0,
    owner_id: req.user.role === 'farmer' || (req.user.role === 'cooperative_admin' && !req.body.owner_id) ? req.user.id : req.body.owner_id,
  });
  res.status(201).json({ animal });
});

module.exports = { listHerd, listBySpecies, registerAnimal };
