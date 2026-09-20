const { Activity } = require('../models');
const { getProfile } = require('../services/profileService');
const { activityRecommendation } = require('../services/recommendationService');
const { storeRecommendation } = require('../services/recommendationStore');
const { DISCLAIMER } = require('../utils/constants');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { asyncHandler } = require('../middleware/validation');

const today = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const profile = await getProfile(userId);
  const result = await activityRecommendation(userId, profile, false);
  const record = await storeRecommendation(userId, 'activity', result);
  return success(res, { ...result, recommendation_id: String(record._id), disclaimer: DISCLAIMER });
});

const weekly = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const profile = await getProfile(userId);
  const result = await activityRecommendation(userId, profile, true);
  return success(res, { ...result, disclaimer: DISCLAIMER });
});

const activities = asyncHandler(async (_req, res) => {
  const items = await Activity.find().sort({ category: 1, activityName: 1 });
  return success(res, items.map((a) => a.toPublic()), `${items.length} activities.`);
});

module.exports = { today, weekly, activities };
