jest.mock('../../src/services/activityService', () => ({ recommendToday: jest.fn(), generateWeeklyPlan: jest.fn() }));
jest.mock('../../src/services/nutritionService', () => ({ generateNutritionPlan: jest.fn() }));
jest.mock('../../src/services/wellnessService', () => ({ getLogs: jest.fn(async () => []), summariseLogs: jest.fn() }));
jest.mock('../../src/services/mlService', () => ({ predictCategory: jest.fn() }));
jest.mock('../../src/services/aiService', () => ({
  enhanceWording: jest.fn(async (t) => t), generateWellnessRecommendations: jest.fn(async () => null),
}));
jest.mock('../../src/services/researchService', () => ({
  ...jest.requireActual('../../src/services/researchService'),
  hasResearchConsent: jest.fn(),
}));
jest.mock('../../src/models', () => ({ Recommendation: { create: jest.fn(async (d) => d) } }));

const { env } = require('../../src/config/env');
const { summariseLogs } = require('../../src/services/wellnessService');
const { predictCategory } = require('../../src/services/mlService');
const { hasResearchConsent, isControlUser } = require('../../src/services/researchService');
const { recommendToday } = require('../../src/services/activityService');
const { Recommendation } = require('../../src/models');
const { activityRecommendation } = require('../../src/services/recommendationService');
const { storeRecommendation } = require('../../src/services/recommendationStore');

const profileDoc = {
  asEngine: () => ({
    age: 30, gender: 'female', height_cm: 165, weight_kg: 60, activity_level: 'light',
    food_preference: 'vegan', allergy_list: [], dislike_list: [], sleep_hours: 7,
    goal: 'maintain_weight', stress_level: null, medical_history: { has_conditions: false },
  }),
};
const summary = { count: 5, avg_sleep: 7, avg_water: 2000, avg_steps: 6000, avg_exercise_minutes: 20,
  avg_calories: 2000, avg_mood: 3, avg_stress: 3, latest_weight: null };

let savedFraction;
beforeEach(() => {
  savedFraction = env.mlControlFraction;
  summariseLogs.mockReturnValue(summary);
  predictCategory.mockReset();
  predictCategory.mockResolvedValue({ available: true, category: 'activity_focus', confidence: 0.7, model_type: 'RF' });
  recommendToday.mockResolvedValue({ activities: [], daily_minutes_target: 30, ml_category_applied: 'activity_focus' });
  hasResearchConsent.mockReset();
  Recommendation.create.mockClear();
});
afterEach(() => { env.mlControlFraction = savedFraction; });

describe('isControlUser', () => {
  test('deterministic and respects 0 / 1', () => {
    expect(isControlUser('abc', 0.5)).toBe(isControlUser('abc', 0.5));
    expect(isControlUser('abc', 0)).toBe(false);
    expect(isControlUser('abc', 1)).toBe(true);
  });
  test('roughly the requested share', () => {
    let n = 0;
    for (let i = 0; i < 4000; i += 1) if (isControlUser(`user-${i}`, 0.2)) n += 1;
    expect(n / 4000).toBeGreaterThan(0.17);
    expect(n / 4000).toBeLessThan(0.23);
  });
});

describe('control holdout', () => {
  test('off by default: ML runs, no consent lookup', async () => {
    env.mlControlFraction = 0;
    const r = await activityRecommendation('u1', profileDoc);
    expect(predictCategory).toHaveBeenCalled();
    expect(hasResearchConsent).not.toHaveBeenCalled();
    expect(r.source).toBe('hybrid');
  });

  test('consenting user in the control arm gets rules only', async () => {
    env.mlControlFraction = 1;
    hasResearchConsent.mockResolvedValue(true);
    const r = await activityRecommendation('u1', profileDoc);
    expect(predictCategory).not.toHaveBeenCalled();
    expect(r.ml).toMatchObject({ skipped: true, reason_code: 'control_holdout' });
    expect(r.source).toBe('rules_only');
    expect(r.why).toMatch(/research comparison group/);
  });

  test('a user who has not consented is never held out', async () => {
    env.mlControlFraction = 1;
    hasResearchConsent.mockResolvedValue(false);
    await activityRecommendation('u1', profileDoc);
    expect(predictCategory).toHaveBeenCalled();
  });
});

describe('storeRecommendation capture', () => {
  test('records features, planned minutes, model version and arm', async () => {
    env.mlControlFraction = 0;
    hasResearchConsent.mockResolvedValue(true);
    const result = await activityRecommendation('u1', profileDoc);
    await storeRecommendation('u1', 'activity', result);
    const doc = Recommendation.create.mock.calls[0][0];
    expect(doc.featureSnapshot).toMatchObject({ age: 30 });
    expect(doc.plannedDailyMinutes).toBe(30);
    expect(doc.modelVersion).toBe('RF');
    expect(doc.adjustmentApplied).toBe(true);
    expect(doc.controlGroup).toBe(false);
    expect(doc.researchConsent).toBe(true);
  });

  test('control-arm plan is recorded as not adjusted', async () => {
    env.mlControlFraction = 1;
    hasResearchConsent.mockResolvedValue(true);
    recommendToday.mockResolvedValue({ activities: [], daily_minutes_target: 25, ml_category_applied: null });
    const result = await activityRecommendation('u1', profileDoc);
    await storeRecommendation('u1', 'activity', result);
    const doc = Recommendation.create.mock.calls[0][0];
    expect(doc).toMatchObject({ controlGroup: true, adjustmentApplied: false, modelVersion: null });
  });

  test('capture data is not serialised into the API response', async () => {
    hasResearchConsent.mockResolvedValue(false);
    const result = await activityRecommendation('u1', profileDoc);
    expect(JSON.stringify(result)).not.toMatch(/win_|hydration_ratio|control_group/);
  });
});
