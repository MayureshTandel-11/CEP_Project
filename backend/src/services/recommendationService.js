const { generateWeeklyPlan, recommendToday } = require('./activityService');
const { enhanceWording, generateWellnessRecommendations, getProvider } = require('./aiService');
const { getAiConsent } = require('./consentService');
const { buildMlFeatures } = require('./featureBuilder');
const { computeHealthMetrics } = require('./healthMetricsService');
const { buildConstraints, isTextSafe } = require('./llmSafety');
const { predictCategory } = require('./mlService');
const { generateNutritionPlan } = require('./nutritionService');
const { getLogs, summariseLogs } = require('./wellnessService');
const { evaluateRules } = require('../rules/ruleEngine');
const { MIN_LOG_DAYS_FOR_ML } = require('../utils/constants');
const { env } = require('../config/env');
const { CAPTURE } = require('./captureKey');
const { isControlUser, hasResearchConsent } = require('./researchService');

async function runMl(features) {
  return predictCategory(features);
}

async function buildContext(userId, profileDoc, days = 7) {
  const profile = profileDoc.asEngine();
  const metrics = computeHealthMetrics(profile);
  const logs = await getLogs(userId, days);
  const summary = summariseLogs(logs);
  const rules = evaluateRules(profile, metrics, logs);
  const features = buildMlFeatures(profile, metrics, summary);
  // With almost no logs the behavioural features are guesses (imputed), so the model
  // would be predicting from defaults. Skip it and fall back to the rules.
  // Optional randomised holdout (consenting users only) to measure the model's effect.
  const controlGroup = summary.count >= MIN_LOG_DAYS_FOR_ML
    && env.mlControlFraction > 0
    && isControlUser(userId, env.mlControlFraction)
    && await hasResearchConsent(userId);
  const ml = controlGroup
    ? {
      available: false,
      skipped: true,
      reason_code: 'control_holdout',
      reason: 'Rule-based output (you are in the research comparison group).',
    }
    : summary.count >= MIN_LOG_DAYS_FOR_ML
    ? await runMl(features)
    : {
      available: false,
      skipped: true,
      reason_code: 'insufficient_logs',
      reason: `Log at least ${MIN_LOG_DAYS_FOR_ML} days of sleep, water and activity to enable ML personalisation; using rule-based output.`,
      log_days: summary.count,
      min_log_days: MIN_LOG_DAYS_FOR_ML,
    };
  return {
    userId,
    profile,
    metrics,
    logs,
    summary,
    rules,
    features,
    ml,
    control_group: controlGroup,
    ml_category: ml.available ? ml.category : null,
    source: ml.available ? 'hybrid' : 'rules_only',
  };
}

function why(ctx, area) {
  const ml = ctx.ml;
  let base;
  if (ml.available) {
    base = `Your plan follows your dietary and safety rules first, then the model's predicted focus area '${ml.category.replace(/_/g, ' ')}' (confidence ${ml.confidence}) was used to re-rank the options.`;
  } else if (ml.skipped) {
    base = `This plan was generated from the rule engine and your health metrics. ${ml.reason}`;
  } else {
    base = 'The ML model is currently unavailable, so this plan was generated from the rule engine and your health metrics alone.';
  }
  const top = ctx.rules.by_area[area].slice(0, 1);
  if (top.length) base += ` Top rule applied: ${top[0].reason}`;
  return base;
}

/**
 * Optional AI rewording of the explanation. The rewritten text is only used if it
 * still satisfies the user's allergy, diet and dislike constraints.
 */
async function maybeEnhance(text, profile, consent) {
  try {
    const enhanced = await enhanceWording(text, consent);
    if (!enhanced || enhanced === text) return text;
    return isTextSafe(enhanced, buildConstraints(profile)) ? enhanced : text;
  } catch {
    return text;
  }
}

/**
 * Attach validated LLM output to a rule/ML result WITHOUT changing the plan, tips,
 * source or explanation. `llm` has already been filtered against the user's
 * constraints by aiService.generateWellnessRecommendations.
 */
function withLlm(result, llm, area) {
  return {
    ...result,
    llm_used: true,
    llm_recommendations: {
      summary: llm.summary,
      [area]: llm[area] || [],
      medical_safety: llm.medical_safety || [],
      professional_guidance: llm.professional_guidance || false,
    },
  };
}

function capture(ctx, result) {
  result[CAPTURE] = { features: ctx.features, control_group: Boolean(ctx.control_group) };
  return result;
}

/**
 * ai_status says why AI text is or is not present:
 *   not_consented  - the user has not allowed an external AI provider (nothing was sent)
 *   not_configured - consent given but no provider is set up on the server
 *   ok             - AI text was generated and passed the safety filters
 *   unavailable    - a provider was tried but failed or returned nothing usable
 */
async function finish(ctx, result, area, { allowLlm = true } = {}) {
  capture(ctx, result);
  const consent = await getAiConsent(ctx.userId);
  if (!consent.external_ai) return { ...result, why: result.why, llm_used: false, ai_status: 'not_consented' };
  if (!allowLlm) return { ...result, llm_used: false, ai_status: 'ok' };
  if (!getProvider()) return { ...result, llm_used: false, ai_status: 'not_configured' };
  const llm = await generateWellnessRecommendations(ctx.profile, ctx.metrics, ctx.summary, consent);
  if (llm) {
    // Rule/ML explanation is kept as-is; the extra AI call for rewording is skipped.
    return { ...withLlm(result, llm, area), ai_status: 'ok' };
  }
  const whyText = await maybeEnhance(result.why, ctx.profile, consent);
  return { ...result, why: whyText, llm_used: false, ai_status: 'unavailable' };
}

async function nutritionRecommendation(userId, profileDoc) {
  const ctx = await buildContext(userId, profileDoc);
  const plan = await generateNutritionPlan(ctx.profile, ctx.metrics, ctx.rules.constraints, ctx.ml_category);
  return finish(ctx, {
    plan,
    metrics: ctx.metrics,
    rules: ctx.rules.by_area.nutrition,
    ml: ctx.ml,
    source: ctx.source,
    why: why(ctx, 'nutrition'),
  }, 'nutrition', {
    // With no safe food there is no plan to describe; AI text must not invent one.
    allowLlm: plan.status !== 'no_safe_match',
  });
}

async function activityRecommendation(userId, profileDoc, weekly = false) {
  const ctx = await buildContext(userId, profileDoc);
  const body = weekly
    ? await generateWeeklyPlan(ctx.profile, ctx.metrics, ctx.ml_category)
    : await recommendToday(ctx.profile, ctx.metrics, ctx.ml_category);
  return finish(ctx, {
    plan: body,
    metrics: ctx.metrics,
    rules: ctx.rules.by_area.activity,
    ml: ctx.ml,
    source: ctx.source,
    why: why(ctx, 'activity'),
  }, 'activity');
}

async function wellnessRecommendation(userId, profileDoc) {
  const ctx = await buildContext(userId, profileDoc);
  return finish(ctx, {
    tips: ctx.rules.by_area.wellness,
    summary: ctx.summary,
    metrics: ctx.metrics,
    ml: ctx.ml,
    source: ctx.source,
    why: why(ctx, 'wellness'),
  }, 'wellness');
}

module.exports = {
  buildContext,
  nutritionRecommendation,
  activityRecommendation,
  wellnessRecommendation,
};
