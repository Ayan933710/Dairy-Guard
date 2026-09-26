const RISK_LEVELS = ['No Risk', 'Low Risk', 'Moderate Risk', 'High Risk'];

function levelFromScore(score) {
  if (score >= 75) return 'High Risk';
  if (score >= 45) return 'Moderate Risk';
  if (score >= 20) return 'Low Risk';
  return 'No Risk';
}

function computeRuleBasedRisk(reading, baselineThi = 60) {
  let score = 0;

  if (reading.ec != null && reading.ec > 6) score += Math.min(35, (reading.ec - 6) * 8);

  if (reading.ph != null && reading.ph > 6.8) score += Math.min(20, (reading.ph - 6.8) * 40);

  if (reading.viscosity_torque != null && reading.viscosity_torque > 50) {
    score += Math.min(20, (reading.viscosity_torque - 50) / 2);
  }

  if (reading.rumination != null && reading.rumination < 0) {
    score += Math.min(20, Math.abs(reading.rumination));
  }

  if (reading.skin_temp != null && reading.skin_temp > 39.3) {
    score += Math.min(15, (reading.skin_temp - 39.3) * 10);
  }

  if (baselineThi > 72) score += Math.min(10, (baselineThi - 72) / 2);

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: levelFromScore(score) };
}

module.exports = { computeRuleBasedRisk, levelFromScore, RISK_LEVELS };
