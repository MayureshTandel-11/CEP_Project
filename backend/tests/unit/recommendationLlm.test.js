/**
 * Composition tests: the LLM can add notes but can never replace the rule/ML plan,
 * and whatever it returns is filtered against the user's profile.
 * The database-backed services are mocked; the real aiService, llmSafety, rules and
 * feature builder run against a mocked fetch.
 */
jest.mock('../../src/services/activityService', () => ({
  recommendToday: jest.fn(),
  generateWeeklyPlan: jest.fn(),
}));
jest.mock('../../src/services/nutritionService', () => ({ generateNutritionPlan: jest.fn() }));
jest.mock('../../src/services/wellnessService', () => ({
  getLogs: jest.fn(async () => []),
  summariseLogs: jest.fn(() => ({
    count: 3, avg_sleep: null, avg_water: null, avg_steps: null, avg_exercise_minutes: null,
    avg_calories: null, avg_mood: null, avg_stress: null, latest_weight: null,
  })),
}));
jest.mock('../../src/services/mlService', () => ({ predictCategory: jest.fn() }));

const { env } = require('../../src/config/env');
const { generateNutritionPlan } = require('../../src/services/nutritionService');
const { recommendToday } = require('../../src/services/activityService');
const { predictCategory } = require('../../src/services/mlService');
const {
  nutritionRecommendation, activityRecommendation, wellnessRecommendation,
} = require('../../src/services/recommendationService');

const BASE_PROFILE = {
  age: 30, gender: 'female', height_cm: 165, weight_kg: 60, activity_level: 'light',
  food_preference: 'vegan', allergy_list: ['peanut'], dislike_list: [],
  sleep_hours: 7, goal: 'maintain_weight', sitting_hours: null, water_intake_ml: null,
  stress_level: null, medical_history: { has_conditions: false },
};
const profileDoc = (overrides = {}) => ({ asEngine: () => ({ ...BASE_PROFILE, ...overrides }) });

const RULE_PLAN = { meals: { breakfast: { items: [{ food_name: 'Ragi Porridge' }] } }, marker: 'rule-plan' };
const ML_OK = {
  available: true, category: 'balanced_wellness', confidence: 0.7, probabilities: {},
};

function mockLlmReply(payload) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return { json: async () => ({ choices: [{ message: { content } }] }) };
}

const savedEnv = {};
beforeEach(() => {
  savedEnv.key = env.openaiApiKey;
  savedEnv.provider = env.aiProvider;
  savedEnv.gemini = env.geminiApiKey;
  savedEnv.llama = env.llamaApiUrl;
  env.openaiApiKey = 'test-key';
  env.aiProvider = 'openai';
  env.geminiApiKey = '';
  env.llamaApiUrl = '';
  global.fetch = jest.fn();
  predictCategory.mockResolvedValue({ ...ML_OK });
  generateNutritionPlan.mockResolvedValue(RULE_PLAN);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  env.openaiApiKey = savedEnv.key;
  env.aiProvider = savedEnv.provider;
  env.geminiApiKey = savedEnv.gemini;
  env.llamaApiUrl = savedEnv.llama;
  jest.restoreAllMocks();
  delete global.fetch;
});

const llmPayload = {
  summary: 'Plenty of lentils and greens this week.',
  nutrition: [
    { title: 'Paneer bhurji', description: 'High protein breakfast.', reason: 'Protein', priority: 'high' },
    { title: 'Peanut chikki', description: 'Energy snack.', reason: 'Energy', priority: 'low' },
    { title: 'Lentil soup', description: 'Warm and filling.', reason: 'Fibre', priority: 'medium' },
  ],
  activity: [{ title: 'Evening walk', description: '20 minutes.', reason: 'Sleep', priority: 'medium' }],
  wellness: [
    { title: 'Warm milk', description: 'A glass of milk before bed.', reason: 'Sleep', priority: 'low' },
    { title: 'Screen break', description: 'No screens 30 min before bed.', reason: 'Sleep', priority: 'high' },
  ],
  medical_safety: [],
  professional_guidance: false,
};

describe('LLM output is supplemental and constraint-filtered', () => {
  test('nutrition: LLM cannot replace the rule plan, source or explanation', async () => {
    global.fetch.mockResolvedValue(mockLlmReply(llmPayload));
    const result = await nutritionRecommendation('u1', profileDoc());

    expect(result.plan).toBe(RULE_PLAN); // same object: untouched
    expect(result.source).toBe('hybrid'); // never 'llm'
    expect(result.llm_used).toBe(true);
    expect(result.why).toMatch(/^Your plan follows your dietary and safety rules first/);
    expect(result.rules.length).toBeGreaterThan(0);
  });

  test('nutrition: vegan + peanut-allergic user receives only compliant LLM items', async () => {
    global.fetch.mockResolvedValue(mockLlmReply(llmPayload));
    const result = await nutritionRecommendation('u1', profileDoc());
    expect(result.llm_recommendations.nutrition.map((i) => i.title)).toEqual(['Lentil soup']);
  });

  test('vegetarian user: meat is removed, paneer is kept', async () => {
    global.fetch.mockResolvedValue(mockLlmReply({
      ...llmPayload,
      nutrition: [
        { title: 'Chicken soup', description: 'Light dinner.', reason: 'x', priority: 'low' },
        { title: 'Paneer tikka', description: 'Protein lunch.', reason: 'x', priority: 'low' },
      ],
    }));
    const result = await nutritionRecommendation('u1', profileDoc({ food_preference: 'vegetarian', allergy_list: [] }));
    expect(result.llm_recommendations.nutrition.map((i) => i.title)).toEqual(['Paneer tikka']);
  });

  test('disliked foods are removed from LLM output', async () => {
    global.fetch.mockResolvedValue(mockLlmReply({
      ...llmPayload,
      nutrition: [
        { title: 'Stuffed bitter gourd', description: 'Lunch.', reason: 'x', priority: 'low' },
        { title: 'Dal tadka', description: 'Lunch.', reason: 'x', priority: 'low' },
      ],
    }));
    const result = await nutritionRecommendation(
      'u1',
      profileDoc({ food_preference: 'vegetarian', allergy_list: [], dislike_list: ['bitter_gourd'] }),
    );
    expect(result.llm_recommendations.nutrition.map((i) => i.title)).toEqual(['Dal tadka']);
  });

  test('wellness: rule tips are kept; LLM wellness items are filtered and separate', async () => {
    global.fetch.mockResolvedValue(mockLlmReply(llmPayload));
    const result = await wellnessRecommendation('u1', profileDoc());
    expect(result.tips.map((t) => t.code)).toContain('NO_LOGS'); // rule output unchanged
    expect(result.source).toBe('hybrid');
    expect(result.llm_recommendations.wellness.map((i) => i.title)).toEqual(['Screen break']);
  });

  test('activity: plan is the rule plan', async () => {
    const body = { activities: [{ name: 'Brisk Walk' }], daily_minutes_target: 25 };
    recommendToday.mockResolvedValue(body);
    global.fetch.mockResolvedValue(mockLlmReply(llmPayload));
    const result = await activityRecommendation('u1', profileDoc());
    expect(result.plan).toBe(body);
    expect(result.llm_used).toBe(true);
  });
});

describe('fallbacks', () => {
  test('no provider configured: pure rule/ML result, no LLM fields', async () => {
    env.openaiApiKey = '';
    const result = await nutritionRecommendation('u1', profileDoc());
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.llm_used).toBe(false);
    expect(result.llm_recommendations).toBeUndefined();
    expect(result.plan).toBe(RULE_PLAN);
  });

  test('ML unavailable: source is rules_only even when the LLM works', async () => {
    predictCategory.mockResolvedValue({ available: false, reason: 'down' });
    global.fetch.mockResolvedValue(mockLlmReply(llmPayload));
    const result = await nutritionRecommendation('u1', profileDoc());
    expect(result.source).toBe('rules_only');
    expect(result.llm_used).toBe(true);
  });

  test('malformed LLM JSON falls back to the rule result', async () => {
    global.fetch.mockResolvedValue(mockLlmReply('this is not json'));
    const result = await nutritionRecommendation('u1', profileDoc());
    expect(result.llm_used).toBe(false);
    expect(result.llm_recommendations).toBeUndefined();
    expect(result.plan).toBe(RULE_PLAN);
  });

  test('provider error falls back to the rule result', async () => {
    global.fetch.mockRejectedValue(new Error('network down'));
    const result = await nutritionRecommendation('u1', profileDoc());
    expect(result.llm_used).toBe(false);
    expect(result.plan).toBe(RULE_PLAN);
  });

  test('a reworded explanation that breaks the diet is discarded', async () => {
    // First call: structured generation fails to parse. Second call: the rewording.
    global.fetch
      .mockResolvedValueOnce(mockLlmReply('not json'))
      .mockResolvedValueOnce(mockLlmReply('Enjoy a bowl of chicken soup today.'));
    const result = await nutritionRecommendation('u1', profileDoc({ allergy_list: [] }));
    expect(result.why).not.toMatch(/chicken/i);
    expect(result.why).toMatch(/^Your plan follows your dietary and safety rules first/);
  });

  test('a harmless reworded explanation is accepted', async () => {
    global.fetch
      .mockResolvedValueOnce(mockLlmReply('not json'))
      .mockResolvedValueOnce(mockLlmReply('Your plan respects your diet first, then the model nudges the ranking.'));
    const result = await nutritionRecommendation('u1', profileDoc({ allergy_list: [] }));
    expect(result.why).toBe('Your plan respects your diet first, then the model nudges the ranking.');
  });
});
