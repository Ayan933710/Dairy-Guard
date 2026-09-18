/**
 * Adapters that convert backend row shapes (snake_case, Postgres column
 * names) into the camelCase shape the existing dashboard components were
 * originally built against (see the old src/data/herd.js mock module).
 * Keeping this mapping in one place means every page shares one contract.
 */

export function normalizeAnimal(row) {
  if (!row) return null;
  return {
    id: row.id, // backend UUID - used for routing (/dashboard/species/:species/:id)
    displayTag: row.display_tag,
    rfidTag: row.rfid_tag,
    name: row.name,
    species: row.species,
    breed: row.breed,
    age: row.age,
    lactation: row.lactation_number,
    risk: row.current_risk_level,
    riskScore: row.current_risk_score,
    rumination: row.rumination_delta_pct != null ? Number(row.rumination_delta_pct) : 0,
    thi: row.thi != null ? Number(row.thi) : 0,
    ownerId: row.owner_id,
  };
}

export function normalizeQuarter(row) {
  return {
    quarter: row.quarter,
    ecDelta: Number(row.ec_delta_pct),
    tempDelta: Number(row.temp_delta_c),
    yieldDrop: Number(row.yield_drop_pct),
  };
}

export function normalizeTrendPoint(row, index) {
  return {
    day: new Date(row.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    risk: row.risk_score,
  };
}

export function normalizePrediction(row) {
  if (!row) return null;
  return {
    modelVersion: row.model_version,
    probability: Number(row.mastitis_probability),
    riskCategory: row.risk_category,
    pattern: row.pattern,
    pathogenHint: row.pathogen_hint,
    affectedQuarters: row.affected_quarters || [],
    quarterResults: (row.quarter_results || []).map((result) => ({
      quarter: result.quarter,
      probability: Number(result.mastitis_probability),
      confidence: Number(result.confidence),
      riskCategory: result.risk_category,
    })),
    createdAt: row.created_at,
  };
}

export function normalizeRecommendation(row) {
  return {
    id: row.id,
    animalId: row.animal_id,
    animalDisplayTag: row.display_tag,
    animalName: row.name,
    profile: row.profile,
    action: row.action,
    urgency: row.urgency,
  };
}

export function normalizeHistoryEvent(row) {
  return {
    id: row.id,
    date: row.event_date ? row.event_date.slice(0, 10) : '',
    animalId: row.animal_id,
    animalName: row.name,
    animalDisplayTag: row.display_tag,
    event: row.event_text,
  };
}
