const { Recommendation } = require('../models');
const { todayIso } = require('../utils/validators');
const { CAPTURE } = require('./captureKey');
const { hasResearchConsent } = require('./researchService');

function extractIds(result, key) {
  const plan = result.plan || {};
  const ids = [];
  if (key === 'food') {
    for (const meal of Object.values(plan.meals || {})) {
      for (const item of meal.items || []) ids.push(String(item.food_id));
    }
  } else {
    for (const item of plan.activities || []) ids.push(String(item.activity_id));
    for (const day of plan.days || []) ids.push(String(day.activity_id));
  }
  return ids.filter(Boolean);
}

/** Planned minutes per day the user is asked to do, if the plan states one. */
function plannedDailyMinutes(plan) {
  if (plan && Number.isFinite(plan.daily_minutes_target)) return plan.daily_minutes_target;
  return null;
}

async function storeRecommendation(userId, recType, result) {
  const ml = result.ml || {};
  const cap = result[CAPTURE] || {};
  const plan = result.plan || {};
  const record = await Recommendation.create({
    userId,
    recDate: todayIso(),
    recType,
    foodIds: recType === 'nutrition' ? extractIds(result, 'food') : [],
    activityIds: recType === 'activity' ? extractIds(result, 'activity') : [],
    summary: (result.why || '').slice(0, 2000),
    mlPrediction: ml.category || null,
    mlConfidence: ml.confidence ?? null,
    source: result.source || 'hybrid',
    featureSnapshot: cap.features || null,
    plannedDailyMinutes: recType === 'activity' ? plannedDailyMinutes(plan) : null,
    modelVersion: ml.available ? (ml.model_version || ml.model_type || 'unknown') : null,
    adjustmentApplied: Boolean(ml.available && plan.ml_category_applied),
    controlGroup: Boolean(cap.control_group),
    researchConsent: await hasResearchConsent(userId),
    payload: { targets: (result.plan || {}).targets, metrics: result.metrics },
  });
  return record;
}

module.exports = { storeRecommendation };
