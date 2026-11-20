/** When allergies, dislikes and diet leave no food, the plan says so instead of inventing one. */
jest.mock('../../src/models', () => ({ Food: { find: jest.fn() } }));
const { Food } = require('../../src/models');
const { generateNutritionPlan, NO_SAFE_MATCH_MESSAGE } = require('../../src/services/nutritionService');

const food = (name, mealType, over = {}) => ({
  foodName: name, mealType, calories: 200, protein: 8, carbohydrates: 30, fat: 5, fiber: 4,
  vegan: true, vegetarian: true, allergenTags: [], category: 'grains',
  toPublic() { return { food_id: name, food_name: name }; },
  ...over,
});
const METRICS = {
  calorie_target: 2000, protein_g: 100, carbs_g: 250, fat_g: 60, fiber_g: 28, water_target_ml: 2500,
};
const PROFILE = { goal: 'maintain_weight', food_preference: 'vegan', allergy_list: [] };
const CONSTRAINTS = (over = {}) => ({ food_preference: 'vegan', excluded_allergens: [], disliked: [], ...over });

test('every food excluded: status no_safe_match, empty meals, a message, nothing substituted', async () => {
  Food.find.mockResolvedValue([
    food('Peanut Chikki', 'snack', { allergenTags: ['peanut'] }),
    food('Chicken Curry', 'lunch', { vegan: false, vegetarian: false }),
  ]);
  const plan = await generateNutritionPlan(PROFILE, METRICS, CONSTRAINTS({ excluded_allergens: ['peanut'] }));
  expect(plan.status).toBe('no_safe_match');
  expect(plan.message).toBe(NO_SAFE_MATCH_MESSAGE);
  for (const meal of Object.values(plan.meals)) {
    expect(meal).toMatchObject({ status: 'no_safe_match', items: [], planned_calories: 0 });
  }
  expect(plan.totals.calories).toBe(0);
  expect(plan.exclusion_reasons).toEqual({ 'contains allergen': 1, 'not vegan': 1 });
});

test('an empty food table is also no_safe_match', async () => {
  Food.find.mockResolvedValue([]);
  expect((await generateNutritionPlan(PROFILE, METRICS, CONSTRAINTS())).status).toBe('no_safe_match');
});

test('some meals safe, some not: partial', async () => {
  Food.find.mockResolvedValue([food('Oats', 'breakfast', { allergenTags: [] })]);
  const plan = await generateNutritionPlan(PROFILE, METRICS, CONSTRAINTS());
  // One safe food exists, so every meal falls back to it: ok, but flagged as a meal-type fallback.
  expect(plan.status).toBe('ok');
  expect(plan.meals.breakfast.meal_type_fallback).toBe(false);
  expect(plan.meals.lunch.meal_type_fallback).toBe(true);
});

test('meals with their own safe foods are ok and not flagged', async () => {
  Food.find.mockResolvedValue(['breakfast', 'lunch', 'dinner', 'snack'].map((m) => food(`${m} dish`, m)));
  const plan = await generateNutritionPlan(PROFILE, METRICS, CONSTRAINTS());
  expect(plan.status).toBe('ok');
  expect(Object.values(plan.meals).every((m) => m.status === 'ok' && m.meal_type_fallback === false)).toBe(true);
  expect(plan.exclusion_reasons).toEqual({});
});

test('a disliked food is excluded by whole word only', async () => {
  Food.find.mockResolvedValue([food('Chamomile Tea', 'snack'), food('Ham Roll', 'snack', { vegan: true, vegetarian: true })]);
  const plan = await generateNutritionPlan(PROFILE, METRICS, CONSTRAINTS({ disliked: ['ham'] }));
  const names = Object.values(plan.meals).flatMap((m) => m.items.map((i) => i.food_name));
  expect(names).toContain('Chamomile Tea');
  expect(names).not.toContain('Ham Roll');
  expect(plan.exclusion_reasons).toEqual({ 'on your dislikes list': 1 });
});
