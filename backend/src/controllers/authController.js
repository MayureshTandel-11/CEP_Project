const { User, UserProfile } = require('../models');
const { authenticate, registerUser } = require('../services/authService');
const { ValidationError } = require('../utils/errors');
const { created, success } = require('../utils/responses');
const { currentUserId, loginUser, logoutUser } = require('../utils/security');
const { requireJson, validateRequired } = require('../utils/validators');
const { asyncHandler } = require('../middleware/validation');

const register = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  validateRequired(data, ['name', 'email', 'password']);
  const user = await registerUser(data.name, data.email, data.password);
  await loginUser(req, user._id);
  return created(res, user.toPublic(false), 'Account created successfully.');
});

const login = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  validateRequired(data, ['email', 'password']);
  const user = await authenticate(data.email, data.password);
  await loginUser(req, user._id);
  const profile = await UserProfile.findOne({ userId: user._id });
  return success(res, user.toPublic(Boolean(profile)), 'Signed in.');
});

const logout = asyncHandler(async (req, res) => {
  await logoutUser(req);
  res.clearCookie('connect.sid');
  return success(res, null, 'Signed out.');
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(currentUserId(req));
  const profile = await UserProfile.findOne({ userId: user._id });
  return success(res, user.toPublic(Boolean(profile)));
});

const setResearchConsent = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  if (typeof data.consent !== 'boolean') {
    throw new ValidationError('consent must be true or false.', { consent: 'boolean required' });
  }
  const user = await User.findById(currentUserId(req));
  user.researchConsent = data.consent;
  user.researchConsentAt = data.consent ? new Date() : null;
  await user.save();
  return success(res, { research_consent: user.researchConsent },
    data.consent ? 'Research consent recorded.' : 'Research consent withdrawn.');
});

// Two separate consents for sending data to an external AI provider (both default off).
// Medical-data consent needs external-AI consent; withdrawing external AI withdraws both.
const setAiConsent = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  const has = (key) => Object.prototype.hasOwnProperty.call(data, key);
  if (!has('external_ai') && !has('medical_data')) {
    throw new ValidationError('Provide external_ai and/or medical_data as true or false.');
  }
  for (const key of ['external_ai', 'medical_data']) {
    if (has(key) && typeof data[key] !== 'boolean') {
      throw new ValidationError(`${key} must be true or false.`, { [key]: 'boolean required' });
    }
  }
  const user = await User.findById(currentUserId(req));
  let external = Boolean(user.externalAiConsent);
  let medical = Boolean(user.medicalDataConsent);
  if (has('external_ai')) external = data.external_ai;
  if (has('medical_data')) {
    if (data.medical_data === true && !external) {
      throw new ValidationError('Turn on external AI use before allowing medical categories to be shared.');
    }
    medical = data.medical_data;
  }
  if (!external) medical = false;
  const now = new Date();
  if (external !== Boolean(user.externalAiConsent)) user.externalAiConsentAt = external ? now : null;
  if (medical !== Boolean(user.medicalDataConsent)) user.medicalDataConsentAt = medical ? now : null;
  user.externalAiConsent = external;
  user.medicalDataConsent = medical;
  await user.save();
  return success(res, { external_ai_consent: external, medical_data_consent: medical }, 'AI data-sharing preferences saved.');
});

module.exports = { register, login, logout, me, setResearchConsent, setAiConsent };
