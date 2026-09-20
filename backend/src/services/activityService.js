const { Activity } = require('../models');
const {
  GOAL_PREFERRED_CATEGORIES, allowedDifficulties, dailyMinutesTarget,
} = require('../rules/activityRules');
const { ACTIVITY_SCORE_WEIGHTS, ML_BONUS_CAP } = require('../utils/constants');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const INTENSITY_RANK = { low: 1, moderate: 2, high: 3 };

const ML_CATEGORY_CATEGORIES = {
  weight_management: ['cardio', 'walking', 'cycling'],
  fitness_improvement: ['cardio', 'strength training', 'jogging'],
  activity_focus: ['walking', 'activity break', 'mobility'],
  hydration_focus: ['walking', 'yoga'],
  sleep_focus: ['yoga', 'stretching', 'walking'],
  balanced_wellness: ['walking', 'yoga', 'cardio'],
};

function clamp(v, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

function scoreActivity(activity, profile, minutesTarget, mlCategory) {
  const preferred = GOAL_PREFERRED_CATEGORIES[profile.goal] || [];
  const parts = {
    goal_match: preferred.includes(activity.category) ? 1 : 0.4,
    level_match: allowedDifficulties(profile.activity_level).includes(activity.difficulty) ? 1 : 0,
    duration_match: clamp(1 - Math.abs(activity.duration - minutesTarget) / Math.max(minutesTarget, 1)),
    category_match: activity.category !== 'activity break' ? 1 : 0.6,
  };
  const base = Object.keys(parts).reduce((s, k) => s + parts[k] * ACTIVITY_SCORE_WEIGHTS[k], 0);
  let bonus = 0;
  if (mlCategory && (ML_CATEGORY_CATEGORIES[mlCategory] || []).includes(activity.category)) {
    bonus = ML_BONUS_CAP;
  }
  return {
    score: Math.round((base + bonus) * 10000) / 10000,
    ml_bonus: Math.round(bonus * 10000) / 10000,
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
  };
}

function caloriesFor(activity, weightKg) {
  return Math.round(activity.caloriesBurned * (weightKg / 70.0));
}

function reason(activity, scored, profile, mlCategory) {
  const bits = [
    `your activity level is ${profile.activity_level}`,
    `your goal is ${profile.goal.replace(/_/g, ' ')}`,
  ];
  if (scored.ml_bonus > 0 && mlCategory) {
    bits.push(`the model flagged '${mlCategory.replace(/_/g, ' ')}' as your focus area`);
  }
  const ceiling = allowedDifficulties(profile.activity_level).slice(-1)[0];
  return `Recommended because ${bits.join(', and ')}. Intensity is capped at '${ceiling}' for your current level.`;
}

async function eligible(profile) {
  const allowed = allowedDifficulties(profile.activity_level);
  return Activity.find({ difficulty: { $in: allowed } });
}

async function recommendToday(profile, _metrics, mlCategory = null) {
  const minutes = dailyMinutesTarget(profile);
  const candidates = await eligible(profile);
  if (!candidates.length) {
    return { activities: [], daily_minutes_target: minutes, note: 'No activities match your current level yet.' };
  }
  const ranked = candidates
    .map((a) => ({ activity: a, ...scoreActivity(a, profile, minutes, mlCategory) }))
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const seen = new Set();
  for (const row of ranked) {
    if (picked.length >= 3) break;
    if (seen.has(row.activity.category)) continue;
    seen.add(row.activity.category);
    picked.push({
      ...row.activity.toPublic(),
      score: row.score,
      ml_bonus: row.ml_bonus,
      estimated_calories_burned: caloriesFor(row.activity, profile.weight_kg),
      reason: reason(row.activity, row, profile, mlCategory),
    });
  }
  return { activities: picked, daily_minutes_target: minutes, ml_category_applied: mlCategory };
}

function pickUnused(pool, usedIds, fallbacks = []) {
  for (const source of [pool, ...fallbacks]) {
    for (const row of source) {
      if (!usedIds.has(String(row.activity._id))) return row;
    }
  }
  return pool[0];
}

async function generateWeeklyPlan(profile, _metrics, mlCategory = null) {
  const minutes = dailyMinutesTarget(profile);
  const candidates = await eligible(profile);
  const ranked = candidates
    .map((a) => ({ activity: a, ...scoreActivity(a, profile, minutes, mlCategory) }))
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) {
    return { days: [], note: 'No activities match your current level yet.' };
  }

  let high = ranked.filter((r) => (INTENSITY_RANK[r.activity.intensity] || 2) === 3);
  let mid = ranked.filter((r) => (INTENSITY_RANK[r.activity.intensity] || 2) === 2);
  let low = ranked.filter((r) => (INTENSITY_RANK[r.activity.intensity] || 2) === 1);
  high = high.length ? high : (mid.length ? mid : low);
  mid = mid.length ? mid : (low.length ? low : high);
  low = low.length ? low : (mid.length ? mid : high);

  const restDays = { sedentary: [3, 6], light: [3, 6], moderate: [6], active: [6] }[profile.activity_level];
  const days = [];
  const usedIds = new Set();
  let previousHigh = false;

  DAYS.forEach((dayName, index) => {
    let pool;
    if (restDays.includes(index)) pool = low;
    else if (previousHigh) pool = index % 2 ? mid : low;
    else pool = index % 2 === 0 ? high : mid;

    const choice = pickUnused(pool, usedIds, [mid, low, high]);
    const act = choice.activity;
    usedIds.add(String(act._id));
    previousHigh = (INTENSITY_RANK[act.intensity] || 2) === 3;
    const intensity = restDays.includes(index) ? 'rest / light' : act.intensity;

    days.push({
      day: dayName,
      is_rest_day: restDays.includes(index),
      activity: act.activityName,
      activity_id: String(act._id),
      category: act.category,
      duration: act.duration,
      difficulty: act.difficulty,
      intensity,
      estimated_calories_burned: caloriesFor(act, profile.weight_kg),
      reason: `${restDays.includes(index) ? 'Recovery day. ' : ''}${reason(act, choice, profile, mlCategory)}`,
    });
  });

  return {
    days,
    weekly_minutes: days.filter((d) => !d.is_rest_day).reduce((s, d) => s + d.duration, 0),
    rest_days: restDays.map((i) => days[i].day),
    ml_category_applied: mlCategory,
  };
}

module.exports = { recommendToday, generateWeeklyPlan, scoreActivity };
