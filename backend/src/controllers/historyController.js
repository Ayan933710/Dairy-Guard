const riskModel = require('../models/riskModel');
const asyncHandler = require('../utils/asyncHandler');

const listHistory = asyncHandler(async (req, res) => {
  const ownerId = req.user.role === 'farmer' ? req.user.id : null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const events = await riskModel.listHerdEvents({ ownerId, limit });
  res.json({ events });
});

const createHistoryEvent = asyncHandler(async (req, res) => {
  const { animal_id, event_text, event_date } = req.body;
  if (!animal_id || !event_text) {
    return res.status(400).json({ error: 'animal_id and event_text are required.' });
  }
  const event = await riskModel.createHerdEvent({ animalId: animal_id, eventText: event_text, eventDate: event_date });
  res.status(201).json({ event });
});

module.exports = { listHistory, createHistoryEvent };
