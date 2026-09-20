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

function imputeRaw(raw) {
  const filled = { ...raw };
  for (const [key, def] of Object.entries(IMPUTATION_DEFAULTS)) {
    if (filled[key] === null || filled[key] === undefined) filled[key] = def;
  }
  if (filled.water_ml === null || filled.water_ml === undefined) {
    filled.water_ml = filled.water_target_ml || 2500;
  }
  if (filled.calories === null || filled.calories === undefined) {
    filled.calories = filled.calorie_target || 2000;
  }
  return filled;
}

function buildFeatureRow(raw) {
  const waterTarget = raw.water_target_ml || 2500;
  const calorieTarget = raw.calorie_target || 2000;
  const sleepHours = raw.sleep_hours ?? SLEEP_TARGET_HOURS;
  const hydrationRatio = (raw.water_ml || 0) / waterTarget;
  const exerciseMinutes = raw.exercise_minutes || 0;
  const stepsRatio = (raw.steps || 0) / STEPS_TARGET;
  const calorieRatio = (raw.calories || calorieTarget) / calorieTarget;

  return {
    bmi: Math.round(Number(raw.bmi) * 100) / 100,
    age: parseInt(raw.age, 10),
    activity_score: ACTIVITY_SCORES[raw.activity_level] || 2,
    sleep_hours: Math.round(Number(sleepHours) * 100) / 100,
    sleep_adequacy: sleepHours >= SLEEP_TARGET_HOURS ? 1 : 0,
    hydration_ratio: Math.round(hydrationRatio * 1000) / 1000,
    hydration_adequacy: hydrationRatio >= 0.9 ? 1 : 0,
    exercise_minutes: Math.round(Number(exerciseMinutes) * 10) / 10,
    exercise_adequacy: exerciseMinutes >= EXERCISE_MINUTES_TARGET ? 1 : 0,
    steps_ratio: Math.round(stepsRatio * 1000) / 1000,
    calorie_ratio: Math.round(calorieRatio * 1000) / 1000,
    stress_level: parseInt(raw.stress_level || 3, 10),
    goal_code: GOAL_CODES[raw.goal] ?? GOAL_CODES.general_wellness,
    gender_code: GENDER_CODES[raw.gender] ?? GENDER_CODES.other,
  };
}

function buildMlFeatures(profile, metrics, summary) {
  const raw = {
    bmi: metrics.bmi,
    age: profile.age,
    gender: profile.gender,
    weight_kg: profile.weight_kg,
    activity_level: profile.activity_level,
    goal: profile.goal,
    sleep_hours: summary.avg_sleep || profile.sleep_hours,
    water_ml: summary.avg_water || profile.water_intake_ml,
    water_target_ml: metrics.water_target_ml,
    exercise_minutes: summary.avg_exercise_minutes,
    steps: summary.avg_steps,
    calories: summary.avg_calories,
    calorie_target: metrics.calorie_target,
    stress_level: profile.stress_level || summary.avg_stress,
  };
  return buildFeatureRow(imputeRaw(raw));
}

module.exports = {
  FEATURE_NAMES,
  FEATURE_DESCRIPTIONS,
  imputeRaw,
  buildFeatureRow,
  buildMlFeatures,
};
