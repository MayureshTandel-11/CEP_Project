/** Domain constants: formulas, thresholds and scoring weights. */

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active'];
const FOOD_PREFERENCES = ['vegetarian', 'non-vegetarian', 'vegan'];
const GOALS = [
  'weight_loss',
  'weight_gain',
  'muscle_building',
  'maintain_weight',
  'improve_fitness',
  'improve_sleep',
  'general_wellness',
];
const GENDERS = ['male', 'female', 'other'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DIFFICULTIES = ['easy', 'moderate', 'hard'];

const ML_CATEGORIES = [
  'weight_management',
  'fitness_improvement',
  'hydration_focus',
  'sleep_focus',
  'activity_focus',
  'balanced_wellness',
];

const BMR_WEIGHT_COEFF = 10.0;
const BMR_HEIGHT_COEFF = 6.25;
const BMR_AGE_COEFF = 5.0;
const BMR_MALE_OFFSET = 5.0;
const BMR_FEMALE_OFFSET = -161.0;
const BMR_OTHER_OFFSET = (BMR_MALE_OFFSET + BMR_FEMALE_OFFSET) / 2;

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};
const ACTIVITY_SCORES = { sedentary: 1, light: 2, moderate: 3, active: 4 };

const BMI_BANDS = [
  [0.0, 18.5, 'Underweight'],
  [18.5, 25.0, 'Normal'],
  [25.0, 30.0, 'Overweight'],
  [30.0, Infinity, 'Obese'],
];

const GOAL_CALORIE_ADJUSTMENT = {
  weight_loss: -0.15,
  weight_gain: 0.12,
  muscle_building: 0.10,
  maintain_weight: 0.0,
  improve_fitness: 0.0,
  improve_sleep: 0.0,
  general_wellness: 0.0,
};
const MIN_CALORIES = { male: 1500, female: 1200, other: 1300 };

const PROTEIN_G_PER_KG = {
  weight_loss: 1.6,
  weight_gain: 1.6,
  muscle_building: 1.8,
  maintain_weight: 1.2,
  improve_fitness: 1.4,
  improve_sleep: 1.2,
  general_wellness: 1.2,
};
const FAT_CALORIE_SHARE = 0.27;
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };
const FIBER_G_PER_1000_KCAL = 14.0;
const WATER_ML_PER_KG = 35.0;
const WATER_ACTIVITY_BONUS_ML = { sedentary: 0, light: 250, moderate: 500, active: 750 };

const SLEEP_TARGET_HOURS = 7.0;
const SLEEP_LOW_HOURS = 6.0;
const STEPS_TARGET = 8000;
const EXERCISE_MINUTES_TARGET = 30;
const STRESS_HIGH_THRESHOLD = 4;
const MOOD_LOW_THRESHOLD = 2;

const WELLNESS_SCORE_WEIGHTS = {
  nutrition: 0.25,
  activity: 0.25,
  sleep: 0.25,
  hydration: 0.25,
};

const FOOD_SCORE_WEIGHTS = {
  goal_match: 0.30,
  preference_match: 0.25,
  calorie_match: 0.20,
  macro_match: 0.15,
  category_match: 0.10,
};
const ACTIVITY_SCORE_WEIGHTS = {
  goal_match: 0.35,
  level_match: 0.30,
  duration_match: 0.20,
  category_match: 0.15,
};

const MEAL_CALORIE_SPLIT = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };

const KNOWN_ALLERGENS = [
  'milk', 'peanut', 'tree_nut', 'soy', 'gluten', 'egg', 'fish', 'shellfish', 'sesame',
];

const DISCLAIMER = (
  'This application is for general wellness and educational purposes only. '
  + 'It is not a medical or clinical tool and does not provide diagnosis, '
  + 'treatment, or medical advice.'
);

const ML_BONUS_CAP = 0.15;

const FEATURE_NAMES = [
  'bmi', 'age', 'activity_score', 'sleep_hours', 'sleep_adequacy',
  'hydration_ratio', 'hydration_adequacy', 'exercise_minutes', 'exercise_adequacy',
  'steps_ratio', 'calorie_ratio', 'stress_level', 'goal_code', 'gender_code',
];

const FEATURE_DESCRIPTIONS = {
  bmi: 'Body Mass Index computed from height and weight',
  age: 'Age in years',
  activity_score: 'Self-reported activity level mapped to 1 (sedentary) - 4 (active)',
  sleep_hours: 'Average logged sleep hours per night',
  sleep_adequacy: '1 if average sleep meets the 7 h guideline, else 0',
  hydration_ratio: 'Average logged water intake divided by the personal water target',
  hydration_adequacy: '1 if hydration ratio is at least 0.9, else 0',
  exercise_minutes: 'Average logged exercise minutes per day',
  exercise_adequacy: '1 if average exercise meets the 30 min/day target, else 0',
  steps_ratio: 'Average logged steps divided by the 8000 step target',
  calorie_ratio: 'Average logged calorie intake divided by the personal calorie target',
  stress_level: 'Self-reported stress on a 1-5 scale',
  goal_code: 'Wellness goal encoded as an integer index',
  gender_code: 'Gender encoded as an integer index',
};

module.exports = {
  ACTIVITY_LEVELS,
  FOOD_PREFERENCES,
  GOALS,
  GENDERS,
  MEAL_TYPES,
  DIFFICULTIES,
  ML_CATEGORIES,
  BMR_WEIGHT_COEFF,
  BMR_HEIGHT_COEFF,
  BMR_AGE_COEFF,
  BMR_MALE_OFFSET,
  BMR_FEMALE_OFFSET,
  BMR_OTHER_OFFSET,
  ACTIVITY_MULTIPLIERS,
  ACTIVITY_SCORES,
  BMI_BANDS,
  GOAL_CALORIE_ADJUSTMENT,
  MIN_CALORIES,
  PROTEIN_G_PER_KG,
  FAT_CALORIE_SHARE,
  KCAL_PER_G,
  FIBER_G_PER_1000_KCAL,
  WATER_ML_PER_KG,
  WATER_ACTIVITY_BONUS_ML,
  SLEEP_TARGET_HOURS,
  SLEEP_LOW_HOURS,
  STEPS_TARGET,
  EXERCISE_MINUTES_TARGET,
  STRESS_HIGH_THRESHOLD,
  MOOD_LOW_THRESHOLD,
  WELLNESS_SCORE_WEIGHTS,
  FOOD_SCORE_WEIGHTS,
  ACTIVITY_SCORE_WEIGHTS,
  MEAL_CALORIE_SPLIT,
  KNOWN_ALLERGENS,
  DISCLAIMER,
  ML_BONUS_CAP,
  FEATURE_NAMES,
  FEATURE_DESCRIPTIONS,
};
