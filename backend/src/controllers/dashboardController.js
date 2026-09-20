const { getDashboard } = require('../services/dashboardService');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { asyncHandler } = require('../middleware/validation');

const dashboard = asyncHandler(async (req, res) => {
  const data = await getDashboard(currentUserId(req), req.query.range || 7);
  const message = data.profile_complete ? 'OK' : 'Profile required.';
  return success(res, data, message);
});

module.exports = { dashboard };
