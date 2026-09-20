const { Food } = require('../models');
const { isFoodAllowed, mealCalorieBudget } = require('../rules/nutritionRules');
const { FOOD_SCORE_WEIGHTS, KCAL_PER_G, MEAL_TYPES, ML_BONUS_CAP } = require('../utils/constants');

const ML_CATEGORY_PREFERENCE = {
  weight_management: 'fiber_dense',
  fitness_improvement: 'protein_dense',
  activity_focus: 'protein_dense',
  hydration_focus: 'water_rich',
  sleep_focus: 'light_evening',
  balanced_wellness: 'balanced',
};

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function _goalScore(food, goal) {
  const energyDensity = food.calories / 100.0;
  const proteinShare = (food.protein * KCAL_PER_G.protein) / Math.max(food.calories, 1);
  if (goal === 'weight_loss') {
    return clamp(0.5 * (1 - clamp(energyDensity / 3.5)) + 0.5 * clamp(food.fiber / 8));
  }
  if (goal === 'weight_gain' || goal === 'muscle_building') {
    return clamp(0.5 * clamp(energyDensity / 3.5) + 0.5 * clamp(proteinShare / 0.35));
  }
  if (goal === 'improve_fitness') {
    return clamp(0.6 * clamp(proteinShare / 0.30) + 0.4 * clamp(food.fiber / 8));
  }
  return clamp(0.5 + 0.5 * clamp(food.fiber / 8));
}

function _preferenceScore(food, preference) {
  if (preference === 'vegan') return food.vegan ? 1 : 0;
  if (preference === 'vegetarian') return food.vegetarian ? 1 : 0;
  return food.vegetarian ? 0.85 : 1;
}

function _calorieScore(food, idealItemCalories) {
  if (idealItemCalories <= 0) return 0.5;
  return clamp(1 - Math.abs(food.calories - idealItemCalories) / idealItemCalories);
}

function _macroScore(food, targetRatios) {
  const total = food.protein * KCAL_PER_G.protein
    + food.carbohydrates * KCAL_PER_G.carbs
    + food.fat * KCAL_PER_G.fat;
  if (total <= 0) return 0.5;
  const actual = {
    protein: food.protein * KCAL_PER_G.protein / total,
    carbs: food.carbohydrates * KCAL_PER_G.carbs / total,
    fat: food.fat * KCAL_PER_G.fat / total,
  };
  const diff = Object.keys(actual).reduce((sum, k) => sum + Math.abs(actual[k] - targetRatios[k]), 0) / 2;
  return clamp(1 - diff);
}

function _mlBonus(food, mlCategory) {
  if (!mlCategory) return 0;
  const mode = ML_CATEGORY_PREFERENCE[mlCategory] || 'balanced';
  if (mode === 'fiber_dense') return ML_BONUS_CAP * clamp(food.fiber / 8);
  if (mode === 'protein_dense') return ML_BONUS_CAP * clamp(food.protein / 25);
  if (mode === 'water_rich') {
    return ['beverages', 'fruits', 'vegetables'].includes(food.category) ? ML_BONUS_CAP : 0;
  }
  if (mode === 'light_evening') return ML_BONUS_CAP * clamp(1 - food.calories / 500);
  return ML_BONUS_CAP * 0.4;
}

function _targetMacroRatios(metrics) {
  const total = metrics.calorie_target;
  return {
    protein: metrics.protein_g * KCAL_PER_G.protein / total,
    carbs: metrics.carbs_g * KCAL_PER_G.carbs / total,
    fat: metrics.fat_g * KCAL_PER_G.fat / total,
  };
}

function scoreFood(food, mealType, profile, metrics, idealItemCalories, mlCategory) {
  const ratios = _targetMacroRatios(metrics);
  const parts = {
    goal_match: _goalScore(food, profile.goal),
    preference_match: _preferenceScore(food, profile.food_preference),
    calorie_match: _calorieScore(food, idealItemCalories),
    macro_match: _macroScore(food, ratios),
    category_match: food.mealType === mealType ? 1 : 0.4,
  };
  const base = Object.keys(parts).reduce((s, k) => s + parts[k] * FOOD_SCORE_WEIGHTS[k], 0);
  const bonus = _mlBonus(food, mlCategory);
  return {
    score: Math.round((base + bonus) * 10000) / 10000,
    base: Math.round(base * 10000) / 10000,
    ml_bonus: Math.round(bonus * 10000) / 10000,
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
  };
}

function reasonFor(food, scored, profile, mlCategory) {
  const bits = [`matches your ${profile.food_preference.replace(/-/g, ' ')} preference`];
  if ((profile.allergy_list || []).length) bits.push('contains none of your recorded allergens');
  const topPart = Object.entries(scored.parts).sort((a, b) => b[1] - a[1])[0][0];
  const labels = {
    goal_match: `suits your ${profile.goal.replace(/_/g, ' ')} goal`,
    preference_match: 'fits your dietary preference',
    calorie_match: 'fits the calorie budget for this meal',
    macro_match: 'fits your protein/carb/fat split',
    category_match: 'is a typical option for this meal',
  };
  bits.push(labels[topPart]);
  if (scored.ml_bonus > 0.01 && mlCategory) {
    bits.push(`was ranked higher because the model flagged '${mlCategory.replace(/_/g, ' ')}' as your focus area`);
  }
  return `Selected because it ${bits.join(', and ')}.`;
}

async function generateNutritionPlan(profile, metrics, constraints, mlCategory = null) {
  const allFoods = await Food.find();
  const allowed = [];
  const excluded = [];
  for (const food of allFoods) {
    const [ok, why] = isFoodAllowed(food, constraints);
    if (ok) allowed.push(food);
    else excluded.push([food, why]);
  }

  const budgets = mealCalorieBudget(metrics.calorie_target);
  const itemsPerMeal = { breakfast: 2, lunch: 3, dinner: 3, snack: 1 };
  const plan = {};
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  for (const meal of MEAL_TYPES) {
    const budget = budgets[meal];
    const want = itemsPerMeal[meal];
    const idealItem = budget / want;
    const mealFoods = allowed.filter((f) => f.mealType === meal);
    const candidates = mealFoods.length ? mealFoods : allowed;
    const ranked = candidates
      .map((f) => ({ food: f, ...scoreFood(f, meal, profile, metrics, idealItem, mlCategory) }))
      .sort((a, b) => b.score - a.score);

    const chosen = [];
    let used = 0;
    for (const row of ranked) {
      if (chosen.length >= want) break;
      if (chosen.length && used + row.food.calories > budget * 1.25) continue;
      const food = row.food;
      used += food.calories;
      chosen.push({
        ...food.toPublic(),
        score: row.score,
        ml_bonus: row.ml_bonus,
        score_breakdown: row.parts,
        reason: reasonFor(food, row, profile, mlCategory),
      });
      totals.calories += food.calories;
      totals.protein += food.protein;
      totals.carbs += food.carbohydrates;
      totals.fat += food.fat;
      totals.fiber += food.fiber;
    }
    plan[meal] = { budget_calories: budget, planned_calories: Math.round(used * 10) / 10, items: chosen };
  }

  return {
    meals: plan,
    totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    targets: {
      calories: metrics.calorie_target,
      protein_g: metrics.protein_g,
      carbs_g: metrics.carbs_g,
      fat_g: metrics.fat_g,
      fiber_g: metrics.fiber_g,
      water_ml: metrics.water_target_ml,
    },
    excluded_count: excluded.length,
    excluded_examples: excluded.slice(0, 8).map(([f, why]) => ({ food_name: f.foodName, reason: why })),
    ml_category_applied: mlCategory,
  };
}

module.exports = { ML_BONUS_CAP, scoreFood, generateNutritionPlan };
