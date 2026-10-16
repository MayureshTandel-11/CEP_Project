/** ML is skipped (rules only) until the user has logged MIN_LOG_DAYS_FOR_ML days. */
jest.mock('../../src/services/activityService', () => ({ recommendToday: jest.fn(), generateWeeklyPlan: jest.fn() }));
jest.mock('../../src/services/nutritionService', () => ({ generateNutritionPlan: jest.fn() }));
jest.mock('../../src/services/wellnessService', () => ({ getLogs: jest.fn(async () => []), summariseLogs: jest.fn() }));
jest.mock('../../src/services/mlService', () => ({ predictCategory: jest.fn() }));

const { summariseLogs } = require('../../src/services/wellnessService');
const { predictCategory } = require('../../src/services/mlService');
const { MIN_LOG_DAYS_FOR_ML } = require('../../src/utils/constants');
const { buildContext } = require('../../src/services/recommendationService');

const profileDoc = {
  asEngine: () => ({
    age: 30, gender: 'female', height_cm: 165, weight_kg: 60, activity_level: 'light',
    food_preference: 'vegan', allergy_list: [], dislike_list: [], sleep_hours: 7,
    goal: 'maintain_weight', stress_level: null, medical_history: { has_conditions: false },
  }),
};
const summary = (count) => ({
  count, avg_sleep: 7, avg_water: 2000, avg_steps: 6000, avg_exercise_minutes: 20,
  avg_calories: 2000, avg_mood: 3, avg_stress: 3, latest_weight: null,
});

beforeEach(() => {
  predictCategory.mockReset();
  predictCategory.mockResolvedValue({ available: true, category: 'balanced_wellness', confidence: 0.7 });
});

test('MIN_LOG_DAYS_FOR_ML is 3', () => expect(MIN_LOG_DAYS_FOR_ML).toBe(3));

test.each([0, 1, 2])('%i logged days: ML skipped, rules only', async (n) => {
  summariseLogs.mockReturnValue(summary(n));
  const ctx = await buildContext('u1', profileDoc);
  expect(predictCategory).not.toHaveBeenCalled();
  expect(ctx.ml).toMatchObject({ available: false, skipped: true, reason_code: 'insufficient_logs', log_days: n });
  expect(ctx.ml_category).toBeNull();
  expect(ctx.source).toBe('rules_only');
  expect(ctx.features).toBeDefined();
});

test('3 logged days: ML is called and used', async () => {
  summariseLogs.mockReturnValue(summary(3));
  const ctx = await buildContext('u1', profileDoc);
  expect(predictCategory).toHaveBeenCalledTimes(1);
  expect(ctx.source).toBe('hybrid');
  expect(ctx.ml_category).toBe('balanced_wellness');
});
