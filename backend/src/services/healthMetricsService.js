const {
  ACTIVITY_MULTIPLIERS, BMI_BANDS, BMR_AGE_COEFF, BMR_FEMALE_OFFSET,
  BMR_HEIGHT_COEFF, BMR_MALE_OFFSET, BMR_OTHER_OFFSET, BMR_WEIGHT_COEFF,
  FAT_CALORIE_SHARE, FIBER_G_PER_1000_KCAL, GOAL_CALORIE_ADJUSTMENT,
  KCAL_PER_G, MIN_CALORIES, PROTEIN_G_PER_KG, WATER_ACTIVITY_BONUS_ML,
  WATER_ML_PER_KG,
} = require('../utils/constants');

const BMI_EXPLANATIONS = {
  Underweight: 'Your BMI is below the typical range. This is a rough screening number, not a diagnosis.',
  Normal: 'Your BMI sits within the typical range for your height.',
  Overweight: 'Your BMI is above the typical range. BMI ignores muscle mass, so it is only a starting point.',
  Obese: 'Your BMI is well above the typical range. Consider discussing this with a qualified health professional.',
};

function calculateBmi(weightKg, heightCm) {
  const heightM = heightCm / 100.0;
  return Math.round((weightKg / (heightM ** 2)) * 100) / 100;
}

function classifyBmi(bmi) {
  for (const [low, high, label] of BMI_BANDS) {
    if (bmi >= low && bmi < high) return label;
  }
  return 'Unknown';
}

function calculateBmr(weightKg, heightCm, age, gender) {
  const offset = { male: BMR_MALE_OFFSET, female: BMR_FEMALE_OFFSET }[gender] ?? BMR_OTHER_OFFSET;
  const bmr = (BMR_WEIGHT_COEFF * weightKg)
    + (BMR_HEIGHT_COEFF * heightCm)
    - (BMR_AGE_COEFF * age)
    + offset;
  return Math.round(bmr * 100) / 100;
}

function calculateTdee(bmr, activityLevel) {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2) * 100) / 100;
}

function calculateCalorieTarget(tdee, goal, gender) {
  const adjusted = tdee * (1 + (GOAL_CALORIE_ADJUSTMENT[goal] || 0));
  const floor = MIN_CALORIES[gender] || MIN_CALORIES.other;
  return Math.round(Math.max(adjusted, floor));
}

function calculateMacros(calorieTarget, weightKg, goal) {
  const proteinG = Math.round((PROTEIN_G_PER_KG[goal] || 1.2) * weightKg);
  const fatG = Math.round((calorieTarget * FAT_CALORIE_SHARE) / KCAL_PER_G.fat);
  const remaining = calorieTarget - (proteinG * KCAL_PER_G.protein) - (fatG * KCAL_PER_G.fat);
  const carbsG = Math.max(Math.round(remaining / KCAL_PER_G.carbs), 50);
  const fiberG = Math.round(FIBER_G_PER_1000_KCAL * calorieTarget / 1000);
  return { protein_g: proteinG, carbs_g: carbsG, fat_g: fatG, fiber_g: fiberG };
}

function calculateWaterTarget(weightKg, activityLevel) {
  const base = weightKg * WATER_ML_PER_KG;
  return Math.round(base + (WATER_ACTIVITY_BONUS_ML[activityLevel] || 0));
}

function computeHealthMetrics(profile) {
  const weight = profile.weight_kg ?? profile.weightKg;
  const height = profile.height_cm ?? profile.heightCm;
  const activity = profile.activity_level ?? profile.activityLevel;
  const goal = profile.goal;
  const gender = profile.gender;
  const age = profile.age;

  const bmi = calculateBmi(weight, height);
  const category = classifyBmi(bmi);
  const bmr = calculateBmr(weight, height, age, gender);
  const tdee = calculateTdee(bmr, activity);
  const calorieTarget = calculateCalorieTarget(tdee, goal, gender);
  const macros = calculateMacros(calorieTarget, weight, goal);
  const waterTarget = calculateWaterTarget(weight, activity);
  const adjPct = Math.round((GOAL_CALORIE_ADJUSTMENT[goal] || 0) * 100);

  return {
    bmi,
    bmi_category: category,
    bmiCategory: category,
    bmi_explanation: BMI_EXPLANATIONS[category] || '',
    bmiExplanation: BMI_EXPLANATIONS[category] || '',
    bmr,
    tdee,
    calorie_target: calorieTarget,
    calorieTarget,
    protein_g: macros.protein_g,
    proteinG: macros.protein_g,
    carbs_g: macros.carbs_g,
    carbsG: macros.carbs_g,
    fat_g: macros.fat_g,
    fatG: macros.fat_g,
    fiber_g: macros.fiber_g,
    fiberG: macros.fiber_g,
    water_target_ml: waterTarget,
    waterTargetMl: waterTarget,
    activity_level: activity,
    activityLevel: activity,
    goal,
    calorie_adjustment_pct: adjPct,
    calorieAdjustmentPct: adjPct,
  };
}

module.exports = {
  BMI_EXPLANATIONS,
  calculateBmi,
  classifyBmi,
  calculateBmr,
  calculateTdee,
  calculateCalorieTarget,
  calculateMacros,
  calculateWaterTarget,
  computeHealthMetrics,
};
