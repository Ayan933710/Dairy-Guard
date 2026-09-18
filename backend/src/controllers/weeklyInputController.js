const weeklyInputModel = require('../models/weeklyInputModel');
const asyncHandler = require('../utils/asyncHandler');

const listWeeklyInputs = asyncHandler(async (req, res) => {
  res.json({ inputs: await weeklyInputModel.list(req.user.id) });
});

const saveWeeklyInput = asyncHandler(async (req, res) => {
  const { week_start, morning_milking_count, evening_milking_count, feed_kg, worker_hygiene, antidote_given, antidote_animal_id } = req.body;
  if (!week_start || morning_milking_count == null || evening_milking_count == null || feed_kg == null || !['good', 'needs_attention', 'poor'].includes(worker_hygiene)) {
    return res.status(400).json({ error: 'week_start, milking counts, feed_kg and worker_hygiene are required.' });
  }
  if (Boolean(antidote_given) && !antidote_animal_id) {
    return res.status(400).json({ error: 'Select the animal ID when an antidote was given.' });
  }
  const input = await weeklyInputModel.upsert(req.user.id, {
    week_start,
    morning_milking_count: Number(morning_milking_count),
    evening_milking_count: Number(evening_milking_count),
    feed_kg: Number(feed_kg),
    worker_hygiene,
    antidote_given: Boolean(antidote_given),
    antidote_animal_id,
  });
  res.status(201).json({ input });
});

module.exports = { listWeeklyInputs, saveWeeklyInput };