const animalModel = require('../models/animalModel');
const telemetryModel = require('../models/telemetryModel');
const predictionModel = require('../models/predictionModel');
const asyncHandler = require('../utils/asyncHandler');

async function loadAndAuthorize(req, res) {
  const animal = await animalModel.findById(req.params.id);
  if (!animal) {
    res.status(404).json({ error: 'Animal not found.' });
    return null;
  }
  if (req.user.role === 'farmer' && animal.owner_id !== req.user.id) {
    res.status(403).json({ error: 'You do not have access to this animal.' });
    return null;
  }
  return animal;
}

const getAnimalDetail = asyncHandler(async (req, res) => {
  const animal = await loadAndAuthorize(req, res);
  if (!animal) return;

  const [quarters, trend, latestPrediction, recentTelemetry] = await Promise.all([
    animalModel.getQuarters(animal.id),
    animalModel.getTrend(animal.id, 30),
    predictionModel.latestForAnimal(animal.id),
    telemetryModel.latestForAnimal(animal.id, 1),
  ]);

  const latestTelemetry = recentTelemetry[0] || null;
  res.json({ animal, quarters, trend, latestPrediction, latestTelemetry });
});

const getAnimalTelemetry = asyncHandler(async (req, res) => {
  const animal = await loadAndAuthorize(req, res);
  if (!animal) return;

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const readings = await telemetryModel.latestForAnimal(animal.id, limit);
  res.json({ animalId: animal.id, readings });
});

const removeAnimal = asyncHandler(async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only the owning farmer can remove an animal.' });
  const animal = await animalModel.remove(req.params.id, req.user.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found or already removed.' });
  res.json({ animal });
});

module.exports = { getAnimalDetail, getAnimalTelemetry, removeAnimal };
