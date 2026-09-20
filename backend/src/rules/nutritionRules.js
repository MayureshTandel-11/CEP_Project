const { MEAL_CALORIE_SPLIT } = require('../utils/constants');

function dietaryConstraints(profile) {
  return {
    food_preference: profile.food_preference,
    excluded_allergens: profile.allergy_list || [],
    disliked: profile.dislike_list || [],
  };
}

function isFoodAllowed(food, constraints) {
  const pref = constraints.food_preference;
  const vegan = food.vegan;
  const vegetarian = food.vegetarian;
  const allergens = food.allergenTags || food.allergens || [];
  const name = (food.foodName || food.food_name || '').toLowerCase();

  if (pref === 'vegan' && !vegan) return [false, 'not vegan'];
  if (pref === 'vegetarian' && !vegetarian) return [false, 'contains meat or fish'];

  const blocked = new Set(constraints.excluded_allergens || []);
  const hit = allergens.filter((a) => blocked.has(a));
  if (hit.length) return [false, `contains allergen: ${hit.sort().join(', ')}`];

  for (const disliked of constraints.disliked || []) {
    if (disliked && name.includes(disliked.replace(/_/g, ' '))) {
      return [false, 'on your dislikes list'];
    }
  }
  return [true, 'allowed'];
}

function mealCalorieBudget(calorieTarget) {
  const out = {};
  for (const [meal, share] of Object.entries(MEAL_CALORIE_SPLIT)) {
    out[meal] = Math.round(calorieTarget * share);
  }
  return out;
}

function nutritionRules(metrics, profile) {
  const out = [];
  const goal = profile.goal;
  if (goal === 'weight_loss') {
    out.push({
      code: 'GOAL_DEFICIT', area: 'nutrition', priority: 1,
      message: `Your daily target of ${metrics.calorie_target} kcal is a moderate ${Math.abs(metrics.calorie_adjustment_pct)}% reduction from your estimated maintenance level.`,
      reason: 'Your goal is weight loss, so a moderate deficit is applied.',
    });
  } else if (goal === 'weight_gain' || goal === 'muscle_building') {
    out.push({
      code: 'GOAL_SURPLUS', area: 'nutrition', priority: 1,
      message: `Your daily target of ${metrics.calorie_target} kcal includes a moderate ${metrics.calorie_adjustment_pct}% surplus, with ${metrics.protein_g} g of protein to support training.`,
      reason: `Your goal is ${goal.replace(/_/g, ' ')}.`,
    });
  } else {
    out.push({
      code: 'GOAL_MAINTAIN', area: 'nutrition', priority: 2,
      message: `Your target of ${metrics.calorie_target} kcal matches your estimated daily energy use.`,
      reason: 'Your goal is to maintain your current weight.',
    });
  }

  if (profile.food_preference === 'vegan') {
    out.push({
      code: 'PREF_VEGAN', area: 'nutrition', priority: 2,
      message: 'Combine pulses, grains and seeds across the day to cover your protein target, and keep an eye on B12 sources.',
      reason: 'Your food preference is set to vegan.',
    });
  }
  if ((profile.allergy_list || []).length) {
    out.push({
      code: 'ALLERGY_FILTER', area: 'nutrition', priority: 1,
      message: `Foods tagged with ${profile.allergy_list.join(', ')} have been removed from every meal.`,
      reason: 'These allergens are recorded on your profile.',
    });
  }
  return out;
}

module.exports = { dietaryConstraints, isFoodAllowed, mealCalorieBudget, nutritionRules };
