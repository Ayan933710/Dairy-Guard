/**
 * ai_inference_service.js
 * ------------------------------------------------------------------
 * Placeholder bridge to the future Python AI microservice that will
 * serve the trained XGBoost mastitis / heat-stress risk model.
 *
 * Today (AI_SERVICE_ENABLED=false in .env): every call transparently
 * falls back to the deterministic rule-engine in riskEngine.js, so
 * the rest of the app (routes, sockets, DB writes) never has to know
 * whether a "real" model is behind this function or not.
 *
 * Tomorrow (Python service live): set AI_SERVICE_ENABLED=true and
 * AI_SERVICE_URL to point at it. This module expects the Python
 * service to expose:
 *
 *   POST {AI_SERVICE_URL}/predict
 *   Request body:
 *     {
 *       "animal_id": "uuid",
 *       "features": {
 *         "ec": 6.4, "ph": 6.9, "viscosity_torque": 58,
 *         "milk_yield": 11.2, "rumination": -14, "skin_temp": 39.6,
 *         "thi": 74, "lactation_number": 3, "age": 5
 *       }
 *     }
 *   Response body:
 *     { "risk_score": 71, "risk_level": "Moderate Risk", "model_version": "xgb_v1.0" }
 *
 * Swap the URL/contract here only - callers (controllers) never change.
 * ------------------------------------------------------------------
 */
const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const { computeRuleBasedRisk } = require('./riskEngine');

/**
 * @param {string} animalId
 * @param {object} features - flattened latest telemetry + animal metadata
 * @param {object} [context] - V2.2 four-quarter readings and history
 * @returns {Promise<{ score: number, level: string, source: string, details?: object }>}
 */
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

/**
 * Batch variant - used by a future scheduled job that re-scores the
 * whole herd periodically (e.g. every 15 minutes via node-cron),
 * rather than only on each individual telemetry ingest.
 */
async function predictRiskBatch(animalFeatureList) {
  return Promise.all(
    animalFeatureList.map(({ animalId, features, context }) => predictRisk(animalId, features, context))
  );
}

module.exports = { predictRisk, predictRiskBatch };
