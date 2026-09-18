/** Powers AnalyticsPage.jsx - herd-wide aggregate stats. */
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getSummary = asyncHandler(async (req, res) => {
  const ownerId = req.user.role === 'farmer' ? req.user.id : null;

  const { rows: riskBreakdown } = await query(
    `SELECT current_risk_level AS risk_level, COUNT(*)::int AS count
       FROM bovine_registry
      WHERE is_active = TRUE AND ($1::uuid IS NULL OR owner_id = $1)
      GROUP BY current_risk_level`,
    [ownerId]
  );

  const { rows: speciesBreakdown } = await query(
    `SELECT species, COUNT(*)::int AS count, AVG(current_risk_score)::numeric(5,1) AS avg_risk_score
       FROM bovine_registry
      WHERE is_active = TRUE AND ($1::uuid IS NULL OR owner_id = $1)
      GROUP BY species`,
    [ownerId]
  );

  const { rows: herdAvgTrend } = await query(
    `SELECT date_trunc('day', rh.recorded_at) AS day, AVG(rh.risk_score)::numeric(5,1) AS avg_risk_score
       FROM risk_history rh
       JOIN bovine_registry br ON br.id = rh.animal_id
      WHERE rh.recorded_at >= now() - interval '30 days'
        AND ($1::uuid IS NULL OR br.owner_id = $1)
      GROUP BY day
      ORDER BY day ASC`,
    [ownerId]
  );

  res.json({ riskBreakdown, speciesBreakdown, herdAvgTrend });
});

module.exports = { getSummary };
