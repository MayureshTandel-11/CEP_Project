const { Feedback, Recommendation } = require('../models');
const { analyseFeedback } = require('../services/feedbackService');
const { NotFoundError } = require('../utils/errors');
const { created, success } = require('../utils/responses');
const { currentUserId, requireOwnership } = require('../utils/security');
const { requireJson, validateInt, validateNumber, validateRequired } = require('../utils/validators');
const { asyncHandler } = require('../middleware/validation');

const submit = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  validateRequired(data, ['rating']);
  const userId = currentUserId(req);
  let recommendationId = data.recommendation_id || null;
  if (recommendationId) {
    const rec = await Recommendation.findById(recommendationId);
    if (!rec) throw new NotFoundError('That recommendation does not exist.');
    requireOwnership(rec.userId, userId);
  }
  const row = await Feedback.create({
    userId,
    recommendationId: recommendationId || null,
    rating: validateInt(data.rating, 'rating'),
    followedPlan: Boolean(data.followed_plan),
    weightChange: validateNumber(data.weight_change, 'weight_change', false),
    stepsChange: validateInt(data.steps_change, 'steps', false),
    sleepChange: validateNumber(data.sleep_change, 'sleep_change', false),
    moodChange: data.mood_change === undefined || data.mood_change === null || data.mood_change === ''
      ? null
      : validateInt(data.mood_change, 'mood', false),
    comment: String(data.comment || '').slice(0, 500),
  });
  return created(res, { feedback: row.toPublic(), analysis: await analyseFeedback(userId) }, 'Thanks - your feedback was saved.');
});

const listFeedback = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const rows = await Feedback.find({ userId }).sort({ createdAt: -1 });
  return success(res, { feedback: rows.map((r) => r.toPublic()), analysis: await analyseFeedback(userId) });
});

const recent = asyncHandler(async (req, res) => {
  const rows = await Recommendation.find({ userId: currentUserId(req) }).sort({ createdAt: -1 }).limit(10);
  return success(res, rows.map((r) => r.toPublic()));
});

module.exports = { submit, listFeedback, recent };
