/** Device registry endpoints - list/register the ESP32-S3 hardware fleet. */
const deviceModel = require('../models/deviceModel');
const asyncHandler = require('../utils/asyncHandler');

const listDevices = asyncHandler(async (req, res) => {
  const devices = await deviceModel.listByOwner(req.user.id);
  res.json({ devices });
});

const registerDevice = asyncHandler(async (req, res) => {
  const { id, device_type, animal_id, label, latitude, longitude } = req.body;
  if (!id || !device_type) {
    return res.status(400).json({ error: 'id and device_type are required.' });
  }
  const device = await deviceModel.register({
    id,
    deviceType: device_type,
    animalId: animal_id || null,
    ownerId: req.user.id,
    label,
  });
  if (device_type === 'hub' && latitude != null && longitude != null) {
    await require('../models/userModel').updateHubLocation(req.user.id, Number(latitude), Number(longitude));
  }
  res.status(201).json({ device });
});

module.exports = { listDevices, registerDevice };
