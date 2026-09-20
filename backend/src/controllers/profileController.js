const { getProfileOrNone, upsertProfile } = require('../services/profileService');
const { ACTIVITY_LEVELS, FOOD_PREFERENCES, GENDERS, GOALS, KNOWN_ALLERGENS } = require('../utils/constants');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { requireJson } = require('../utils/validators');
const { asyncHandler } = require('../middleware/validation');

const readProfile = asyncHandler(async (req, res) => {
  const profile = await getProfileOrNone(currentUserId(req));
  return success(res, profile ? profile.toPublic() : null, profile ? 'Profile loaded.' : 'No profile yet.');
});

const writeProfile = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  const profile = await upsertProfile(currentUserId(req), data);
  return success(res, profile.toPublic(), 'Profile saved.');
});

const profileOptions = asyncHandler(async (_req, res) => {
  return success(res, {
    activity_levels: ACTIVITY_LEVELS,
    food_preferences: FOOD_PREFERENCES,
    goals: GOALS,
    genders: GENDERS,
    allergens: KNOWN_ALLERGENS,
  });
});

module.exports = { readProfile, writeProfile, profileOptions };
