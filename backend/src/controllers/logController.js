const { UserLog } = require('../models');
const { getLogs } = require('../services/wellnessService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { created, success } = require('../utils/responses');
const { currentUserId, requireOwnership } = require('../utils/security');
const { requireJson, todayIso, validateDate, validateInt, validateNumber } = require('../utils/validators');
const { asyncHandler } = require('../middleware/validation');

const ALLOWED_RANGES = [7, 30, 90];

function cleanLog(data) {
  return {
    weight: validateNumber(data.weight, 'weight_kg', false),
    water: validateInt(data.water, 'water_intake_ml', false),
    sleep: validateNumber(data.sleep, 'sleep_hours', false),
    steps: validateInt(data.steps, 'steps', false),
    exerciseMinutes: validateInt(data.exercise_minutes, 'exercise_minutes', false),
    calories: data.calories === undefined || data.calories === null || data.calories === ''
      ? null
      : validateInt(data.calories, 'calories', false),
    mood: validateInt(data.mood, 'mood', false),
    stress: validateInt(data.stress, 'stress_level', false),
    notes: String(data.notes || '').slice(0, 255),
  };
}

const createLog = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  const logDate = validateDate(data.date || todayIso());
  if (logDate > todayIso()) throw new ValidationError('You cannot log a future date.');
  const cleaned = cleanLog(data);
  const values = Object.entries(cleaned).filter(([k]) => k !== 'notes').map(([, v]) => v);
  if (values.every((v) => v === null || v === '')) {
    throw new ValidationError('Please fill in at least one value before saving.');
  }
  const userId = currentUserId(req);
  const existing = await UserLog.findOne({ userId, logDate });
  if (existing) {
    for (const [key, value] of Object.entries(cleaned)) {
      if (value !== null && value !== '') existing[key] = value;
    }
    await existing.save();
    return success(res, existing.toPublic(), 'Log updated for that date.');
  }
  const log = await UserLog.create({ userId, logDate, ...cleaned });
  return created(res, log.toPublic(), 'Log saved.');
});

const listLogs = asyncHandler(async (req, res) => {
  const days = Number(req.query.range || 7);
  if (!ALLOWED_RANGES.includes(days)) throw new ValidationError('Range must be one of 7, 30 or 90.');
  const logs = await getLogs(currentUserId(req), days);
  return success(
    res,
    { range: days, logs: logs.map((l) => l.toPublic()) },
    logs.length ? 'Log history loaded.' : 'No data yet.',
  );
});

const updateLog = asyncHandler(async (req, res) => {
  const log = await UserLog.findById(req.params.id);
  if (!log) throw new NotFoundError('That log entry does not exist.');
  requireOwnership(log.userId, currentUserId(req));
  const data = requireJson(req.body);
  for (const [key, value] of Object.entries(cleanLog(data))) {
    if (value !== null && value !== '') log[key] = value;
  }
  await log.save();
  return success(res, log.toPublic(), 'Log updated.');
});

const deleteLog = asyncHandler(async (req, res) => {
  const log = await UserLog.findById(req.params.id);
  if (!log) throw new NotFoundError('That log entry does not exist.');
  requireOwnership(log.userId, currentUserId(req));
  await log.deleteOne();
  return success(res, null, 'Log deleted.');
});

module.exports = { createLog, listLogs, updateLog, deleteLog };
