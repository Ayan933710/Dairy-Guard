/**
 * IoT ingestion endpoint for ESP32-S3 devices posting directly over HTTP.
 * Protected by a shared device key (see middleware/authMiddleware.verifyDeviceKey),
 * NOT a user JWT, since firmware cannot practically perform an interactive login.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ingestTelemetry, ingestSpotCheck } = require('../services/telemetryIngestService');
const telemetryModel = require('../models/telemetryModel');

const ingest = asyncHandler(async (req, res) => {
  const { device_id, rfid_tag, farm_id } = req.body;
  if (!device_id || !rfid_tag || !farm_id) {
    return res.status(400).json({ error: 'device_id, rfid_tag and farm_id are required fields.' });
  }

  const result = await ingestTelemetry(req.body);
  res.status(201).json({
    message: 'Telemetry ingested successfully.',
    reading_id: result.reading.id,
    risk: result.risk,
  });
});

const spotCheck = asyncHandler(async (req, res) => {
  const { device_id, rfid_tag, farm_id, quarters } = req.body;
  if (!device_id || !rfid_tag || !farm_id || !quarters) {
    return res.status(400).json({ error: 'device_id, rfid_tag, farm_id and quarters are required.' });
  }
  const result = await ingestSpotCheck(req.body);
  res.status(201).json({ message: 'Spot check evaluated successfully.', ...result });
});

/** For authenticated dashboard users browsing raw telemetry across their herd. */
const recent = asyncHandler(async (req, res) => {
  const ownerId = req.user.role === 'farmer' ? req.user.id : null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const readings = await telemetryModel.recentForHerd({ ownerId, limit });
  res.json({ readings });
});

module.exports = { ingest, spotCheck, recent };
