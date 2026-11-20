const { ask, buildContext, getProvider } = require('../services/aiService');
const { getAiConsent } = require('../services/consentService');
const { computeHealthMetrics } = require('../services/healthMetricsService');
const { getProfile } = require('../services/profileService');
const { getLogs, summariseLogs } = require('../services/wellnessService');
const { DISCLAIMER } = require('../utils/constants');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { requireJson, validateRequired } = require('../utils/validators');
const { asyncHandler } = require('../middleware/validation');

const status = asyncHandler(async (req, res) => {
  const provider = getProvider();
  const consent = await getAiConsent(currentUserId(req));
  return success(res, {
    configured: Boolean(provider),
    provider: provider ? provider.name : null,
    consent_external_ai: consent.external_ai,
    consent_medical_data: consent.medical_data,
  });
});

const assistant = asyncHandler(async (req, res) => {
  const data = requireJson(req.body);
  validateRequired(data, ['message']);
  const userId = currentUserId(req);
  const consent = await getAiConsent(userId);
  const profile = await getProfile(userId);
  const engine = profile.asEngine();
  const metrics = computeHealthMetrics(engine);
  const summary = summariseLogs(await getLogs(userId, 7));
  const context = buildContext(engine, metrics, summary, consent);
  const result = await ask(String(data.message).slice(0, 1000), context, engine, consent);
  return success(res, { ...result, disclaimer: DISCLAIMER });
});

module.exports = { status, assistant };
