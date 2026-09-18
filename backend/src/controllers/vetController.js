const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const district = req.user.vet_district?.trim();
  if (!district) {
    return res.json({
      district: null,
      setupRequired: true,
      farms: [],
      recommendations: [],
      history: [],
    });
  }

  const { rows: farms } = await query(`
    SELECT u.id AS farm_owner_id, u.farm_id, u.farm_name, u.full_name AS owner_name,
           u.farm_state, u.farm_district, u.hub_latitude, u.hub_longitude,
           COUNT(br.id)::int AS total_animals,
           COUNT(br.id) FILTER (WHERE br.current_risk_level = 'High Risk'
             OR LOWER(br.current_mastitis_status) = 'high')::int AS mastitis_risk_animals,
           COUNT(br.id) FILTER (WHERE LOWER(br.current_amr_status) = 'rising')::int AS amr_rising_animals
      FROM users u
      LEFT JOIN bovine_registry br ON br.owner_id = u.id AND br.is_active = TRUE
    WHERE u.role IN ('farmer', 'cooperative_admin')
      AND LOWER(TRIM(u.farm_district)) = LOWER(TRIM($1::text))
     GROUP BY u.id
     ORDER BY u.farm_name NULLS LAST, u.full_name`, [district]);

  const farmIds = farms.map((farm) => farm.farm_owner_id);
  const { rows: recommendations } = await query(`
    SELECT u.id AS farm_owner_id, u.farm_id, u.farm_name, u.full_name AS owner_name,
           u.hub_latitude, u.hub_longitude,
           COUNT(br.id) FILTER (WHERE br.current_risk_level = 'High Risk'
             OR LOWER(br.current_mastitis_status) = 'high')::int AS mastitis_risk_animals,
           CASE WHEN COUNT(br.id) FILTER (WHERE br.current_risk_level = 'High Risk'
             OR LOWER(br.current_mastitis_status) = 'high') > 0
             THEN 'Visit and review high mastitis-risk animals'
             ELSE 'Review preventive herd-health plan' END AS action
      FROM users u JOIN bovine_registry br ON br.owner_id = u.id AND br.is_active = TRUE
    WHERE u.id = ANY($1::uuid[])
     GROUP BY u.id
    HAVING COUNT(br.id) FILTER (WHERE br.current_risk_level = 'High Risk'
      OR LOWER(br.current_mastitis_status) = 'high') > 0
    ORDER BY mastitis_risk_animals DESC`, [farmIds]);

  const { rows: history } = await query(`
    SELECT EXTRACT(YEAR FROM COALESCE(rh.recorded_at, ah.recorded_at))::int AS year, u.id AS farm_owner_id,
           u.farm_id, u.farm_name, u.full_name AS owner_name,
           MAX(rh.risk_score)::int AS peak_mastitis_score,
           MAX(ah.amr_score)::int AS peak_amr_score,
           COUNT(DISTINCT br.id)::int AS affected_animals
      FROM users u
      JOIN bovine_registry br ON br.owner_id = u.id
      LEFT JOIN risk_history rh ON rh.animal_id = br.id
      LEFT JOIN amr_history ah ON ah.animal_id = br.id
    WHERE u.role IN ('farmer', 'cooperative_admin')
      AND LOWER(TRIM(u.farm_district)) = LOWER(TRIM($1::text))
     GROUP BY year, u.id
     ORDER BY year DESC, u.farm_name NULLS LAST`, [district]);

  res.json({ district, farms, recommendations, history });
});

module.exports = { getDashboard };