/** Powers PredictionsPage.jsx - AI/vet recommendations per animal. */
const riskModel = require('../models/riskModel');
const animalModel = require('../models/animalModel');
const userModel = require('../models/userModel');
const aiInferenceService = require('../services/ai_inference_service');
const telemetryModel = require('../models/telemetryModel');
const predictionModel = require('../models/predictionModel');
const { buildV2Context } = require('../services/telemetryIngestService');
const { sendMastitisAlert } = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

const listRecommendations = asyncHandler(async (req, res) => {
  const ownerId = req.user.role === 'farmer' ? req.user.id : null;
  const recommendations = await riskModel.listRecommendations({ ownerId });
  res.json({ recommendations });
});

const createRecommendation = asyncHandler(async (req, res) => {
  const { animal_id, profile, action, urgency } = req.body;
  if (!animal_id || !profile || !action || !urgency) {
    return res.status(400).json({ error: 'animal_id, profile, action and urgency are required.' });
  }
  const recommendation = await riskModel.createRecommendation({
    animalId: animal_id,
    profile,
    action,
    urgency,
    issuedBy: req.user.id,
  });
  res.status(201).json({ recommendation });
});

/**
 * On-demand re-scoring for a single animal - lets the dashboard show a
 * "Run prediction now" button rather than waiting for the next telemetry
 * push. Uses the animal's most recent cached metadata as feature input.
 */
const runPrediction = asyncHandler(async (req, res) => {
  const animal = await animalModel.findById(req.params.animalId);
  if (!animal) return res.status(404).json({ error: 'Animal not found.' });
  if (req.user.role === 'farmer' && animal.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this animal.' });
  }

  const features = {
    thi: animal.thi,
    rumination: animal.rumination_delta_pct,
    lactation_number: animal.lactation_number,
    age: animal.age,
  };
  const context = await buildV2Context(animal.id, telemetryModel, animal.thi);
  const { score, level, source, details } = await aiInferenceService.predictRisk(animal.id, features, context);

  const updated = await animalModel.updateRiskSnapshot(animal.id, {
    riskLevel: level,
    riskScore: score,
    ruminationDeltaPct: null,
    thi: null,
  });
  await riskModel.insertRiskHistory(animal.id, { riskScore: score, riskLevel: level, source });
  if (details?.quarter_results) {
    await predictionModel.insertRun({
      animalId: animal.id,
      modelVersion: source,
      probability: details.mastitis_probability,
      riskCategory: details.risk_category || level,
      pattern: details.pattern,
      pathogenHint: details.pathogen_hint,
      affectedQuarters: details.affected_quarters,
      inputSnapshot: { features, ...context },
      quarterResults: details.quarter_results,
    });
  }

  if (level === 'High Risk') {
    const owner = await userModel.findById(updated.owner_id);
    const recommendation = await riskModel.listRecommendations({ animalId: updated.id }).then((r) => r[0]);
    sendMastitisAlert({ animal: updated, owner, riskScore: score, riskLevel: level, reading: null, recommendation }).catch(() => {});
  }

  res.json({ animal: updated, risk: { score, level, source } });
});

module.exports = { listRecommendations, createRecommendation, runPrediction };
