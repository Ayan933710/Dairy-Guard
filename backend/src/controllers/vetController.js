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
    SELECT u.id AS farm_owner_id, u.farm_id, u.farm_name, u.full_name AS owner_name, u.phone AS owner_phone,
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
    SELECT u.id AS farm_owner_id, u.farm_id, u.farm_name, u.full_name AS owner_name, u.phone AS owner_phone,
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
    WITH farm_history AS (
      SELECT
        u.id AS farm_owner_id,
        u.farm_id,
        u.farm_name,
        u.full_name AS owner_name,
        EXTRACT(YEAR FROM rh.recorded_at)::int AS year,
        MAX(rh.risk_score)::int AS peak_mastitis_score,
        NULL::int AS peak_amr_score,
        COUNT(DISTINCT br.id)::int AS affected_animals
      FROM users u
      JOIN bovine_registry br ON br.owner_id = u.id
      LEFT JOIN risk_history rh ON rh.animal_id = br.id
      WHERE u.role IN ('farmer', 'cooperative_admin')
        AND LOWER(TRIM(u.farm_district)) = LOWER(TRIM($1::text))
        AND rh.recorded_at IS NOT NULL
      GROUP BY u.id, u.farm_id, u.farm_name, u.full_name, EXTRACT(YEAR FROM rh.recorded_at)

      UNION ALL

      SELECT
        u.id AS farm_owner_id,
        u.farm_id,
        u.farm_name,
        u.full_name AS owner_name,
        EXTRACT(YEAR FROM ah.recorded_at)::int AS year,
        NULL::int AS peak_mastitis_score,
        MAX(ah.amr_score)::int AS peak_amr_score,
        COUNT(DISTINCT br.id)::int AS affected_animals
      FROM users u
      JOIN bovine_registry br ON br.owner_id = u.id
      LEFT JOIN amr_history ah ON ah.animal_id = br.id
      WHERE u.role IN ('farmer', 'cooperative_admin')
        AND LOWER(TRIM(u.farm_district)) = LOWER(TRIM($1::text))
        AND ah.recorded_at IS NOT NULL
      GROUP BY u.id, u.farm_id, u.farm_name, u.full_name, EXTRACT(YEAR FROM ah.recorded_at)
    )
    SELECT
      farm_owner_id,
      farm_id,
      farm_name,
      owner_name,
      year,
      MAX(peak_mastitis_score) AS peak_mastitis_score,
      MAX(peak_amr_score) AS peak_amr_score,
      MAX(affected_animals) AS affected_animals
    FROM farm_history
    GROUP BY farm_owner_id, farm_id, farm_name, owner_name, year
    ORDER BY year DESC, farm_name NULLS LAST`, [district]);

  res.json({ district, farms, recommendations, history });
});

module.exports = { getDashboard };