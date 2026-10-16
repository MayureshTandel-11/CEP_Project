const { ACTIVITY_SCORES, FEATURE_NAMES, FEATURE_DESCRIPTIONS, GOALS, GENDERS, SLEEP_TARGET_HOURS, STEPS_TARGET, EXERCISE_MINUTES_TARGET } = require('../utils/constants');

const GOAL_CODES = Object.fromEntries(GOALS.map((g, i) => [g, i]));
const GENDER_CODES = Object.fromEntries(GENDERS.map((g, i) => [g, i]));

const IMPUTATION_DEFAULTS = {
  sleep_hours: SLEEP_TARGET_HOURS,
  water_ml: null,
  exercise_minutes: 0,
  steps: 0,
  calories: null,
  stress_level: 3,
};

/**
 * Round half up with plain IEEE-754 operations, so Python (ai-ml/app/features/
 * engineering.py, round_half_up) produces bit-identical values. Do not replace with
 * Math.round(x * f) / f or Python's round(): the tie-breaking differs between languages.
 */
function roundHalfUp(value, decimals) {
  const factor = 10 ** decimals;
  return Math.floor(Number(value) * factor + 0.5) / factor;
}

function isMissing(value) {
  return value === null || value === undefined;
}

function imputeRaw(raw) {
  const filled = { ...raw };
  for (const [key, def] of Object.entries(IMPUTATION_DEFAULTS)) {
    if (isMissing(filled[key])) filled[key] = def;
  }
  if (isMissing(filled.water_ml)) {
    filled.water_ml = filled.water_target_ml || 2500;
  }
  if (isMissing(filled.calories)) {
    filled.calories = filled.calorie_target || 2000;
  }
  return filled;
}

function buildFeatureRow(raw) {
  const waterTarget = raw.water_target_ml || 2500;
  const calorieTarget = raw.calorie_target || 2000;
  const sleepHours = Number(isMissing(raw.sleep_hours) ? SLEEP_TARGET_HOURS : raw.sleep_hours);
  const hydrationRatio = (raw.water_ml || 0) / waterTarget;
  const exerciseMinutes = raw.exercise_minutes || 0;
  const stepsRatio = (raw.steps || 0) / STEPS_TARGET;
  const calorieRatio = (raw.calories || calorieTarget) / calorieTarget;
  // Stress is a 1-5 scale: round (not truncate) an average, then clamp.
  const stress = isMissing(raw.stress_level)
    ? 3
    : Math.min(5, Math.max(1, roundHalfUp(raw.stress_level, 0)));

  return {
    bmi: roundHalfUp(raw.bmi, 2),
    age: parseInt(raw.age, 10),
    activity_score: ACTIVITY_SCORES[raw.activity_level] || 2,
    sleep_hours: roundHalfUp(sleepHours, 2),
    sleep_adequacy: sleepHours >= SLEEP_TARGET_HOURS ? 1 : 0,
    hydration_ratio: roundHalfUp(hydrationRatio, 3),
    hydration_adequacy: hydrationRatio >= 0.9 ? 1 : 0,
    exercise_minutes: roundHalfUp(exerciseMinutes, 1),
    exercise_adequacy: exerciseMinutes >= EXERCISE_MINUTES_TARGET ? 1 : 0,
    steps_ratio: roundHalfUp(stepsRatio, 3),
    calorie_ratio: roundHalfUp(calorieRatio, 3),
    stress_level: stress,
    goal_code: GOAL_CODES[raw.goal] ?? GOAL_CODES.general_wellness,
    gender_code: GENDER_CODES[raw.gender] ?? GENDER_CODES.other,
  };
}

function buildMlFeatures(profile, metrics, summary) {
  // `??` (not `||`): a logged value of 0 is data, not "missing".
  const raw = {
    bmi: metrics.bmi,
    age: profile.age,
    gender: profile.gender,
    weight_kg: profile.weight_kg,
    activity_level: profile.activity_level,
    goal: profile.goal,
    sleep_hours: summary.avg_sleep ?? profile.sleep_hours,
    water_ml: summary.avg_water ?? profile.water_intake_ml,
    water_target_ml: metrics.water_target_ml,
    exercise_minutes: summary.avg_exercise_minutes,
    steps: summary.avg_steps,
    calories: summary.avg_calories,
    calorie_target: metrics.calorie_target,
    stress_level: profile.stress_level ?? summary.avg_stress,
  };
  return buildFeatureRow(imputeRaw(raw));
}

module.exports = {
  FEATURE_NAMES,
  FEATURE_DESCRIPTIONS,
  roundHalfUp,
  imputeRaw,
  buildFeatureRow,
  buildMlFeatures,
};
