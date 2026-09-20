const { computeHealthMetrics } = require('../services/healthMetricsService');
const { getProfile } = require('../services/profileService');
const { wellnessRecommendation } = require('../services/recommendationService');
const { calculateWellnessScore, getLogs } = require('../services/wellnessService');
const { DISCLAIMER } = require('../utils/constants');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { asyncHandler } = require('../middleware/validation');

const wellness = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const profile = await getProfile(userId);
  const result = await wellnessRecommendation(userId, profile);
  return success(res, { ...result, disclaimer: DISCLAIMER });
});

const wellnessScore = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const profile = await getProfile(userId);
  const metrics = computeHealthMetrics(profile.asEngine());
  const logs = await getLogs(userId, 7);
  return success(res, calculateWellnessScore(logs, metrics));
});

module.exports = { wellness, wellnessScore };
