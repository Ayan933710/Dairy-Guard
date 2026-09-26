const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const { computeRuleBasedRisk } = require('./riskEngine');

async function predictRisk(animalId, features, context = {}) {
  if (!env.AI_SERVICE_ENABLED) {
    const { score, level } = computeRuleBasedRisk(features, features.thi);
    return { score, level, source: 'rule_engine' };
  }

  try {
    const response = await axios.post(
      `${env.AI_SERVICE_URL}/predict`,
      { animal_id: animalId, features, ...context },
      { timeout: env.AI_SERVICE_TIMEOUT_MS }
    );
    const { risk_score, risk_level, model_version, ...details } = response.data;
    return { score: risk_score, level: risk_level, source: model_version || 'xgboost', details };
  } catch (err) {
    logger.warn(`[ai_inference_service] Python AI service unreachable, falling back to rule engine: ${err.message}`);
    const { score, level } = computeRuleBasedRisk(features, features.thi);
    return { score, level, source: 'rule_engine_fallback' };
  }
}

async function predictRiskBatch(animalFeatureList) {
  return Promise.all(
    animalFeatureList.map(({ animalId, features, context }) => predictRisk(animalId, features, context))
  );
}

module.exports = { predictRisk, predictRiskBatch };
