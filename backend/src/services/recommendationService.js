const { generateWeeklyPlan, recommendToday } = require('./activityService');
const { enhanceWording, generateWellnessRecommendations } = require('./aiService');
const { buildMlFeatures } = require('./featureBuilder');
const { computeHealthMetrics } = require('./healthMetricsService');
const { predictCategory } = require('./mlService');
const { generateNutritionPlan } = require('./nutritionService');
const { getLogs, summariseLogs } = require('./wellnessService');
const { evaluateRules } = require('../rules/ruleEngine');

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
  const ml = await runMl(features);
  return {
    profile,
    metrics,
    logs,
    summary,
    rules,
    features,
    ml,
    ml_category: ml.available ? ml.category : null,
    source: ml.available ? 'hybrid' : 'rules_only',
  };
}

function why(ctx, area) {
  const ml = ctx.ml;
  let base;
  if (ml.available) {
    base = `Your plan follows your dietary and safety rules first, then the model's predicted focus area '${ml.category.replace(/_/g, ' ')}' (confidence ${ml.confidence}) was used to re-rank the options.`;
  } else {
    base = 'The ML model is currently unavailable, so this plan was generated from the rule engine and your health metrics alone.';
  }
  const top = ctx.rules.by_area[area].slice(0, 1);
  if (top.length) base += ` Top rule applied: ${top[0].reason}`;
  return base;
}

async function maybeEnhance(text) {
  try {
    return await enhanceWording(text);
  } catch {
    return text;
  }
}

/**
 * Format LLM nutrition array into the shape the existing frontend expects.
 * The existing frontend renders plan.meals, plan.targets, plan.totals, plan.excluded_count, etc.
 * We attach llm_recommendations alongside so Nutrition.jsx can display them if present.
 */
function mergeLlmIntoNutritionResult(llm, ctx, plan) {
  return {
    plan,
    metrics: ctx.metrics,
    rules: ctx.rules.by_area.nutrition,
    ml: ctx.ml,
    source: 'llm',
    why: llm.summary || '',
    llm_recommendations: {
      summary: llm.summary,
      nutrition: llm.nutrition || [],
      medical_safety: llm.medical_safety || [],
      professional_guidance: llm.professional_guidance || false,
    },
  };
}

function mergeLlmIntoActivityResult(llm, ctx, body) {
  return {
    plan: body,
    metrics: ctx.metrics,
    rules: ctx.rules.by_area.activity,
    ml: ctx.ml,
    source: 'llm',
    why: llm.summary || '',
    llm_recommendations: {
      summary: llm.summary,
      activity: llm.activity || [],
      medical_safety: llm.medical_safety || [],
      professional_guidance: llm.professional_guidance || false,
    },
  };
}

function mergeLlmIntoWellnessResult(llm, ctx) {
  return {
    // Convert LLM wellness items to the tip shape the frontend expects
    tips: (llm.wellness || []).map((item) => ({
      code: item.title.toLowerCase().replace(/\s+/g, '_').slice(0, 40),
      message: item.description,
      reason: item.reason,
      priority: item.priority,
    })),
    summary: ctx.summary,
    metrics: ctx.metrics,
    ml: ctx.ml,
    source: 'llm',
    why: llm.summary || '',
    llm_recommendations: {
      summary: llm.summary,
      wellness: llm.wellness || [],
      medical_safety: llm.medical_safety || [],
      professional_guidance: llm.professional_guidance || false,
    },
  };
}

async function nutritionRecommendation(userId, profileDoc) {
  const ctx = await buildContext(userId, profileDoc);
  // Rule-based plan (always computed — fallback and used for targets/excluded display)
  const plan = await generateNutritionPlan(ctx.profile, ctx.metrics, ctx.rules.constraints, ctx.ml_category);

  // Attempt LLM-primary recommendations
  const llm = await generateWellnessRecommendations(ctx.profile, ctx.metrics, ctx.summary);
  if (llm) {
    return mergeLlmIntoNutritionResult(llm, ctx, plan);
  }

  // Fallback: existing rule-based + ML flow
  const whyText = await maybeEnhance(why(ctx, 'nutrition'));
  return {
    plan,
    metrics: ctx.metrics,
    rules: ctx.rules.by_area.nutrition,
    ml: ctx.ml,
    source: ctx.source,
    why: whyText,
  };
}

async function activityRecommendation(userId, profileDoc, weekly = false) {
  const ctx = await buildContext(userId, profileDoc);
  const body = weekly
    ? await generateWeeklyPlan(ctx.profile, ctx.metrics, ctx.ml_category)
    : await recommendToday(ctx.profile, ctx.metrics, ctx.ml_category);

  // Attempt LLM-primary recommendations
  const llm = await generateWellnessRecommendations(ctx.profile, ctx.metrics, ctx.summary);
  if (llm) {
    return mergeLlmIntoActivityResult(llm, ctx, body);
  }

  // Fallback: existing rule-based + ML flow
  const whyText = await maybeEnhance(why(ctx, 'activity'));
  return {
    plan: body,
    metrics: ctx.metrics,
    rules: ctx.rules.by_area.activity,
    ml: ctx.ml,
    source: ctx.source,
    why: whyText,
  };
}

async function wellnessRecommendation(userId, profileDoc) {
  const ctx = await buildContext(userId, profileDoc);

  // Attempt LLM-primary recommendations
  const llm = await generateWellnessRecommendations(ctx.profile, ctx.metrics, ctx.summary);
  if (llm) {
    return mergeLlmIntoWellnessResult(llm, ctx);
  }

  // Fallback: existing rule engine
  return {
    tips: ctx.rules.by_area.wellness,
    summary: ctx.summary,
    metrics: ctx.metrics,
    ml: ctx.ml,
    source: ctx.source,
    why: await maybeEnhance(why(ctx, 'wellness')),
  };
}

module.exports = {
  buildContext,
  nutritionRecommendation,
  activityRecommendation,
  wellnessRecommendation,
};
