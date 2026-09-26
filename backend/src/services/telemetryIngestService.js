/**
 * Shared ingestion pipeline used by BOTH the HTTP ingestion route
 * (routes/telemetryRoutes.js, for devices that can reach the internet
 * directly / for testing with curl or Postman) AND the MQTT bridge
 * (services/mqttBridge.js, for ESP32-S3 devices that publish over
 * LoRa -> NANDI Hub -> MQTT).
 *
 * Keeping this logic in one place guarantees identical behaviour
 * (validation, DB writes, risk scoring, socket broadcast) no matter
 * which transport the telemetry arrived over.
 */
const animalModel = require('../models/animalModel');
const telemetryModel = require('../models/telemetryModel');
const riskModel = require('../models/riskModel');
const predictionModel = require('../models/predictionModel');
const deviceModel = require('../models/deviceModel');
const userModel = require('../models/userModel');
const aiInferenceService = require('./ai_inference_service');
const { emitToOwner } = require('./socketService');
const { sendMastitisAlert } = require('./notificationService');
const logger = require('./../utils/logger');
const { randomUUID } = require('crypto');

/**
 * @param {object} payload - raw JSON telemetry from an ESP32-S3 device
 * @param {string} payload.device_id
 * @param {string} [payload.device_type] - 'collar' | 'cup' | 'hub'
 * @param {string} payload.rfid_tag - 15-digit AIN read off the animal's ear tag
 * @param {string} payload.farm_id - the 8-character Farm ID punched into the hub/collar/cup at
 *   setup time. Every reading must carry it, and it must match the ID of the farmer who owns
 *   the animal being reported on - this is what keeps one farm's hardware from ever being able
 *   to write into another farm's herd data, even if it (accidentally or otherwise) reports an
 *   RFID tag that belongs to someone else.
 * @param {string} [payload.quarter] - 'LF' | 'RF' | 'LR' | 'RR' (four mammary quarters)
 * @param {number} [payload.ec]
 * @param {number} [payload.ph]
 * @param {number} [payload.viscosity_torque]
 * @param {number} [payload.yield]
 * @param {number} [payload.rumination]
 * @param {number} [payload.skin_temp]
 * @param {string} [payload.recorded_at] - ISO timestamp captured on-device
 */
async function ingestTelemetry(payload) {
  const animal = await animalModel.findByRfid(payload.rfid_tag);
  if (!animal) {
    throw Object.assign(new Error(`No animal registered with RFID tag ${payload.rfid_tag}`), { statusCode: 404 });
  }

  const owner = await userModel.findById(animal.owner_id);
  if (!owner) {
    throw Object.assign(new Error('Owner for this animal not found - telemetry rejected.'), { statusCode: 404 });
  }
  if (owner.farm_id && payload.farm_id && owner.farm_id !== payload.farm_id) {
    logger.warn(`[ingestTelemetry] Hardware farm_id (${payload.farm_id}) differs from owner farm_id (${owner.farm_id}); associating with owner.`);
  }

  if (payload.latitude != null && payload.longitude != null) {
    await userModel.updateHubLocation(owner.id, Number(payload.latitude), Number(payload.longitude));
  }

  // 1. Persist the raw reading (time-series table)
  const reading = await telemetryModel.insert({
    animal_id: animal.id,
    device_id: payload.device_id,
    device_type: payload.device_type || 'cup',
    quarter: payload.quarter || null,
    ec: payload.ec,
    ph: payload.ph,
    viscosity_torque: payload.viscosity_torque,
    milk_yield: payload.yield,
    rumination: payload.rumination,
    skin_temp: payload.skin_temp,
    recorded_at: payload.recorded_at || null,
    raw_payload: payload,
  });

  // 2. Track device "last seen" for the hardware health view
  await deviceModel.upsertLastSeen(payload.device_id, { batteryPct: payload.battery_pct }).catch(() => {
    // Device may not be pre-registered yet (e.g. first boot) - not fatal for ingestion.
    logger.warn(`[ingest] device ${payload.device_id} not found in registry; reading still stored.`);
  });

  // 3. Score risk (rule engine today, XGBoost microservice once live)
  const features = {
    ec: payload.ec,
    ph: payload.ph,
    viscosity_torque: payload.viscosity_torque,
    milk_yield: payload.yield,
    rumination: payload.rumination,
    skin_temp: payload.skin_temp,
    thi: animal.thi,
    lactation_number: animal.lactation_number,
    age: animal.age,
  };

  const quarterContext = await buildV2Context(animal.id, telemetryModel, animal.thi);
  const { score, level, source, details } = await aiInferenceService.predictRisk(animal.id, features, quarterContext);

  const updatedAnimal = await animalModel.updateRiskSnapshot(animal.id, {
    riskLevel: level,
    riskScore: score,
    ruminationDeltaPct: payload.rumination,
    thi: payload.thi,
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
      inputSnapshot: { features, ...quarterContext },
      quarterResults: details.quarter_results,
    });
  }

  if (payload.quarter && (payload.ec != null || payload.skin_temp != null)) {
    await riskModel.upsertQuarterReading(animal.id, payload.quarter, {
      ecDeltaPct: payload.ec ?? 0,
      tempDeltaC: payload.skin_temp ?? 0,
      yieldDropPct: payload.yield_drop_pct ?? 0,
    });
  }

  // 4. Push real-time updates to the owning farmer's dashboard
  emitToOwner(updatedAnimal.owner_id, 'telemetry:new', reading);
  emitToOwner(updatedAnimal.owner_id, 'animal:updated', updatedAnimal);

  if (level === 'High Risk') {
    emitToOwner(updatedAnimal.owner_id, 'alert:new', {
      animalId: updatedAnimal.id,
      displayTag: updatedAnimal.display_tag,
      name: updatedAnimal.name,
      riskScore: score,
      riskLevel: level,
      message: `${updatedAnimal.name} (${updatedAnimal.display_tag}) just crossed into High Risk (${score}%).`,
    });

    // 5. WhatsApp/SMS/email alert to the farmer - never blocks the response if it fails.
    const recommendation = await riskModel.listRecommendations({ animalId: updatedAnimal.id }).then((r) => r[0]);
    sendMastitisAlert({ animal: updatedAnimal, owner, riskScore: score, riskLevel: level, reading, recommendation }).catch(
      (err) => logger.warn('[ingest] notification dispatch failed:', err.message)
    );
  }

  return { reading, animal: updatedAnimal, risk: { score, level, source, details } };
}

/**
 * Ingest one complete, instantaneous milk test. All four quarter readings
 * share one spot_check_id and are sent to the model as one snapshot.
 */
async function ingestSpotCheck(payload) {
  const animal = await animalModel.findByRfid(payload.rfid_tag);
  if (!animal) throw Object.assign(new Error(`No animal registered with RFID tag ${payload.rfid_tag}`), { statusCode: 404 });
  const owner = await userModel.findById(animal.owner_id);
  if (!owner) {
    throw Object.assign(new Error('Owner for this animal not found - spot check rejected.'), { statusCode: 404 });
  }
  if (owner.farm_id && payload.farm_id && owner.farm_id !== payload.farm_id) {
    logger.warn(`[ingestSpotCheck] Hardware farm_id (${payload.farm_id}) differs from owner farm_id (${owner.farm_id}); associating with owner.`);
  }

  const input = payload.quarters || {};
  const required = ['LF', 'RF', 'LR', 'RR'];
  const missing = required.filter((quarter) => !input[quarter]);
  if (missing.length) {
    throw Object.assign(new Error(`Missing required quarter readings: ${missing.join(', ')}`), { statusCode: 400 });
  }

  for (const quarter of required) {
    const sample = input[quarter];
    if (sample.yield == null) sample.yield = 0.0;
    if (sample.skin_temp == null) sample.skin_temp = 38.5;
    for (const field of ['ec', 'ph', 'viscosity_torque', 'yield', 'skin_temp']) {
      if (!Number.isFinite(Number(sample[field]))) {
        throw Object.assign(new Error(`${quarter}.${field} must be numeric`), { statusCode: 400 });
      }
    }
  }

  const spotCheckId = payload.spot_check_id || randomUUID();
  const recordedAt = payload.recorded_at || null;
  const readings = [];
  for (const quarter of required) {
    const sample = input[quarter];
    readings.push(await telemetryModel.insert({
      animal_id: animal.id,
      device_id: payload.device_id,
      device_type: payload.device_type || 'cup',
      quarter,
      ec: Number(sample.ec),
      ph: Number(sample.ph),
      viscosity_torque: Number(sample.viscosity_torque),
      milk_yield: Number(sample.yield),
      rumination: payload.rumination,
      skin_temp: Number(sample.skin_temp),
      recorded_at: recordedAt,
      raw_payload: payload,
      spot_check_id: spotCheckId,
    }));
  }

  await deviceModel.upsertLastSeen(payload.device_id, { batteryPct: payload.battery_pct }).catch(() => {});
  const topTemp = payload.skin_temp ?? input.LF?.skin_temp ?? 38.5;
  const topThi = payload.thi != null ? Number(payload.thi) : (animal.thi || 72.4);

  const context = buildSpotCheckContext(input, topThi);
  const features = {
    ec: input.LF.ec,
    ph: input.LF.ph,
    viscosity_torque: input.LF.viscosity_torque,
    milk_yield: input.LF.yield,
    rumination: payload.rumination,
    skin_temp: topTemp,
    thi: topThi,
    lactation_number: animal.lactation_number,
    age: animal.age,
  };
  const risk = await aiInferenceService.predictRisk(animal.id, features, context);
  const score = Number(risk.score);
  const updatedAnimal = await animalModel.updateRiskSnapshot(animal.id, {
    riskLevel: risk.level,
    riskScore: score,
    ruminationDeltaPct: payload.rumination,
    thi: topThi,
  });
  await riskModel.insertRiskHistory(animal.id, { riskScore: score, riskLevel: risk.level, source: risk.source });

  if (risk.details?.quarter_results) {
    await predictionModel.insertRun({
      animalId: animal.id,
      modelVersion: risk.source,
      probability: risk.details.mastitis_probability,
      riskCategory: risk.details.risk_category || risk.level,
      pattern: risk.details.pattern,
      pathogenHint: risk.details.pathogen_hint,
      affectedQuarters: risk.details.affected_quarters,
      inputSnapshot: { spot_check_id: spotCheckId, features, ...context },
      quarterResults: risk.details.quarter_results,
    });
  }

  emitToOwner(updatedAnimal.owner_id, 'telemetry:new', { spot_check_id: spotCheckId, readings });
  emitToOwner(updatedAnimal.owner_id, 'animal:updated', updatedAnimal);
  return {
    spotCheckId,
    readingIds: readings.map((reading) => reading.id),
    animal: updatedAnimal,
    risk: {
      ...risk,
      mastitis: risk.details?.mastitis ?? (risk.level === 'High Risk'),
      confidence: risk.details?.confidence ?? null,
    },
  };
}

const QUARTER_MAP = { LF: 'Q1_FL', RF: 'Q2_FR', LR: 'Q3_RL', RR: 'Q4_RR' };

async function buildV2Context(animalId, telemetryStore, animalThi) {
  const readings = await telemetryStore.latestForAnimal(animalId, 100);
  const latestByQuarter = new Map();
  for (const item of readings) {
    const quarter = QUARTER_MAP[item.quarter];
    if (quarter && !latestByQuarter.has(quarter)) latestByQuarter.set(quarter, item);
  }

  const required = Object.values(QUARTER_MAP);
  if (!required.every((quarter) => latestByQuarter.has(quarter))) return {};

  const quarters = {};
  for (const [quarter, item] of latestByQuarter) {
    quarters[quarter] = {
      ec: Number(item.ec),
      temp: Number(item.skin_temp),
      yield: Number(item.milk_yield),
      raw_motor_ma: Number(item.viscosity_torque),
      ph: Number(item.ph),
    };
  }

  const valid = Object.values(quarters).every((quarter) =>
    Object.values(quarter).every((value) => Number.isFinite(value))
  );
  if (!valid) return {};

  const latestCollar = readings.find((item) => item.rumination != null);
  const ecHistory = {};
  for (const item of readings) {
    const quarter = QUARTER_MAP[item.quarter];
    if (quarter && item.ec != null) ecHistory[quarter] = [...(ecHistory[quarter] || []), Number(item.ec)];
  }

  return {
    quarters,
    collar_features: {
      rumination_3day_trend: Number(latestCollar?.rumination || 0),
      motility_drop: 0,
    },
    thi: Number(animalThi || 0),
    ec_history: ecHistory,
  };
}

function buildSpotCheckContext(input, animalThi) {
  const quarters = {};
  for (const [sourceQuarter, modelQuarter] of Object.entries(QUARTER_MAP)) {
    const sample = input[sourceQuarter];
    quarters[modelQuarter] = {
      ec: Number(sample.ec),
      temp: Number(sample.skin_temp),
      yield: Number(sample.yield),
      raw_motor_ma: Number(sample.viscosity_torque),
      ph: Number(sample.ph),
    };
  }
  return {
    quarters,
    collar_features: { rumination_3day_trend: 0, motility_drop: 0 },
    thi: Number(animalThi || 0),
    ec_history: {},
  };
}

module.exports = { ingestTelemetry, ingestSpotCheck, buildV2Context };
