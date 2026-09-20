const { UserLog } = require('../models');
const {
  EXERCISE_MINUTES_TARGET, SLEEP_TARGET_HOURS, STEPS_TARGET, WELLNESS_SCORE_WEIGHTS,
} = require('../utils/constants');

function daysAgoIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

async function getLogs(userId, days = 7) {
  const since = daysAgoIso(days);
  return UserLog.find({ userId, logDate: { $gte: since } }).sort({ logDate: -1 });
}

function avg(values) {
  const nums = values.filter((v) => v !== null && v !== undefined);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function summariseLogs(logs) {
  return {
    count: logs.length,
    avg_sleep: avg(logs.map((l) => l.sleep)),
    avg_water: avg(logs.map((l) => l.water)),
    avg_steps: avg(logs.map((l) => l.steps)),
    avg_exercise_minutes: avg(logs.map((l) => l.exerciseMinutes)),
    avg_calories: avg(logs.map((l) => l.calories)),
    avg_mood: avg(logs.map((l) => l.mood)),
    avg_stress: avg(logs.map((l) => l.stress)),
    latest_weight: (logs.find((l) => l.weight !== null && l.weight !== undefined) || {}).weight ?? null,
  };
}

function ratioScore(actual, target, overPenalty = false) {
  if (actual === null || actual === undefined || !target) return null;
  let ratio = actual / target;
  if (overPenalty && ratio > 1.15) ratio = Math.max(0, 2 - ratio);
  return Math.round(Math.min(ratio, 1) * 100);
}

function calculateWellnessScore(logs, metrics) {
  const summary = summariseLogs(logs);
  if (!logs.length) {
    return {
      available: false,
      label: 'Weekly Wellness Engagement Score',
      message: 'No data yet. Log a few days of wellness data to see your score.',
      categories: {},
      overall: null,
    };
  }

  let nutrition = ratioScore(summary.avg_calories, metrics.calorie_target, true);
  let nutritionNote;
  if (nutrition === null) {
    nutrition = Math.round(Math.min(summary.count / 7, 1) * 100);
    nutritionNote = 'Based on logging consistency (no calorie intake logged).';
  } else {
    nutritionNote = 'How close your logged intake was to your calorie target.';
  }

  const activitySteps = ratioScore(summary.avg_steps, STEPS_TARGET) || 0;
  const activityMinutes = ratioScore(summary.avg_exercise_minutes, EXERCISE_MINUTES_TARGET) || 0;
  const activity = Math.round(0.5 * activitySteps + 0.5 * activityMinutes);
  const sleep = ratioScore(summary.avg_sleep, SLEEP_TARGET_HOURS) || 0;
  const hydration = ratioScore(summary.avg_water, metrics.water_target_ml) || 0;

  const categories = {
    nutrition: { score: nutrition, weight: WELLNESS_SCORE_WEIGHTS.nutrition, note: nutritionNote },
    activity: { score: activity, weight: WELLNESS_SCORE_WEIGHTS.activity, note: 'Average of your step and exercise-minute achievement.' },
    sleep: { score: sleep, weight: WELLNESS_SCORE_WEIGHTS.sleep, note: `Logged sleep against the ${SLEEP_TARGET_HOURS} h guideline.` },
    hydration: { score: hydration, weight: WELLNESS_SCORE_WEIGHTS.hydration, note: 'Logged water against your personal water target.' },
  };
  const overall = Math.round(Object.values(categories).reduce((s, c) => s + c.score * c.weight, 0));

  return {
    available: true,
    label: 'Weekly Wellness Engagement Score',
    disclaimer: 'This is an engagement metric for this project, not a medical score.',
    categories,
    overall,
    days_logged: summary.count,
  };
}

module.exports = { getLogs, summariseLogs, calculateWellnessScore };
