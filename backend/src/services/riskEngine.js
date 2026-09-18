/**
 * Rule-based fallback risk engine.
 *
 * This produces an interim risk score/level from raw sensor deltas
 * using simple, transparent thresholds (documented in the PRD) so the
 * dashboard has *something* meaningful to show before the real
 * XGBoost model (see ai_inference_service.js) is trained and deployed.
 *
 * IMPORTANT: This is intentionally simple and explainable, not a
 * substitute for the ML model. ai_inference_service.js should be
 * treated as the source of truth once AI_SERVICE_ENABLED=true.
 */

const RISK_LEVELS = ['No Risk', 'Low Risk', 'Moderate Risk', 'High Risk'];

function levelFromScore(score) {
  if (score >= 75) return 'High Risk';
  if (score >= 45) return 'Moderate Risk';
  if (score >= 20) return 'Low Risk';
  return 'No Risk';
}

/**
 * @param {object} reading - latest telemetry reading for one animal
 * @param {number} [reading.ec] - electrical conductivity (mS/cm)
 * @param {number} [reading.ph]
 * @param {number} [reading.viscosity_torque]
 * @param {number} [reading.rumination] - rumination index; negative = decline
 * @param {number} [reading.skin_temp]
 * @param {number} [baselineThi] - herd Temperature-Humidity Index for heat-stress weighting
 * @returns {{ score: number, level: string }}
 */
function computeRuleBasedRisk(reading, baselineThi = 60) {
  let score = 0;

  // Electrical conductivity spikes correlate with subclinical mastitis
  if (reading.ec != null && reading.ec > 6) score += Math.min(35, (reading.ec - 6) * 8);

  // Alkaline shift (pH > 6.8) suggests leaking mammary tissue
  if (reading.ph != null && reading.ph > 6.8) score += Math.min(20, (reading.ph - 6.8) * 40);

  // High CMT viscosity torque proxy for elevated somatic cell count
  if (reading.viscosity_torque != null && reading.viscosity_torque > 50) {
    score += Math.min(20, (reading.viscosity_torque - 50) / 2);
  }

  // Rumination decline is an early, non-specific distress signal
  if (reading.rumination != null && reading.rumination < 0) {
    score += Math.min(20, Math.abs(reading.rumination));
  }

  // Elevated skin temperature -> possible fever
  if (reading.skin_temp != null && reading.skin_temp > 39.3) {
    score += Math.min(15, (reading.skin_temp - 39.3) * 10);
  }

  // Heat-stress modifier from ambient THI
  if (baselineThi > 72) score += Math.min(10, (baselineThi - 72) / 2);

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: levelFromScore(score) };
}

module.exports = { computeRuleBasedRisk, levelFromScore, RISK_LEVELS };
