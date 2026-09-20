const { computeHealthMetrics } = require('../services/healthMetricsService');
const { getProfile } = require('../services/profileService');
const { DISCLAIMER } = require('../utils/constants');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { asyncHandler } = require('../middleware/validation');

const healthMetrics = asyncHandler(async (req, res) => {
  const profile = await getProfile(currentUserId(req));
  const metrics = computeHealthMetrics(profile.asEngine());
  return success(res, { ...metrics, disclaimer: DISCLAIMER });
});

module.exports = { healthMetrics };
