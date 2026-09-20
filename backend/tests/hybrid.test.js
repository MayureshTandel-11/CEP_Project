const VALID_PROFILE = global.VALID_PROFILE;
const authAgent = (email) => global.authAgent(email);

describe('hybrid engine', () => {
  async function items(agent) {
    const plan = (await agent.get('/api/recommendations/nutrition')).body.data.plan;
    return Object.values(plan.meals).flatMap((meal) => meal.items);
  }

  test('ml is used when available', async () => {
    const agent = await authAgent('hyb1@test.com');
    const data = (await agent.get('/api/recommendations/nutrition')).body.data;
    expect(data.source).toBe('hybrid');
    expect(data.ml.available).toBe(true);
    expect(data.plan.ml_category_applied).toBe(data.ml.category);
  });

  test('ml visibly influences ranking', async () => {
    const agent = await authAgent('hyb2@test.com');
    const list = await items(agent);
    expect(list.some((i) => i.ml_bonus > 0)).toBe(true);
  });

  test('ml cannot override an allergy', async () => {
    const agent = await authAgent('hyb3@test.com');
    await agent.put('/api/profile').send({
      ...VALID_PROFILE,
      food_preference: 'non-vegetarian',
      allergies: ['milk', 'peanut', 'egg', 'fish', 'shellfish', 'tree_nut', 'soy', 'gluten'],
    });
    for (const item of await items(agent)) {
      const blocked = new Set(['milk', 'peanut', 'egg', 'fish', 'shellfish', 'tree_nut', 'soy', 'gluten']);
      expect(item.allergen_tags.some((t) => blocked.has(t))).toBe(false);
    }
  });

  test('ml cannot override vegan preference', async () => {
    const agent = await authAgent('hyb4@test.com');
    await agent.put('/api/profile').send({ ...VALID_PROFILE, food_preference: 'vegan', allergies: [] });
    expect((await items(agent)).every((i) => i.vegan)).toBe(true);
  });

  test('ml cannot raise the difficulty ceiling', async () => {
    const agent = await authAgent('hyb5@test.com');
    await agent.put('/api/profile').send({ ...VALID_PROFILE, activity_level: 'sedentary' });
    const data = (await agent.get('/api/recommendations/activity')).body.data;
    expect(data.ml.available).toBe(true);
    expect(data.plan.activities.every((a) => a.difficulty === 'easy')).toBe(true);
  });

  test('rule-based fallback when ml disabled', async () => {
    const { env } = require('../src/config/env');
    const { setPredictOverride } = require('../src/services/mlService');
    env.mlEnabled = false;
    setPredictOverride(null);
    const agent = await authAgent('hyb6@test.com');
    for (const endpoint of [
      '/api/recommendations/nutrition',
      '/api/recommendations/activity',
      '/api/recommendations/activity/weekly',
      '/api/recommendations/wellness',
    ]) {
      const res = await agent.get(endpoint);
      expect(res.status).toBe(200);
      expect(res.body.data.source).toBe('rules_only');
      expect(res.body.data.ml.available).toBe(false);
      expect(JSON.stringify(res.body).toLowerCase()).not.toContain('ml error');
    }
  });

  test('full plan still produced without ml', async () => {
    const { env } = require('../src/config/env');
    const { setPredictOverride } = require('../src/services/mlService');
    env.mlEnabled = false;
    setPredictOverride(null);
    const agent = await authAgent('hyb7@test.com');
    const plan = (await agent.get('/api/recommendations/nutrition')).body.data.plan;
    expect(Object.values(plan.meals).every((meal) => meal.items.length > 0)).toBe(true);
    const days = (await agent.get('/api/recommendations/activity/weekly')).body.data.plan.days;
    expect(days).toHaveLength(7);
  });

  test('every recommendation carries an explanation', async () => {
    const agent = await authAgent('hyb8@test.com');
    for (const endpoint of [
      '/api/recommendations/nutrition',
      '/api/recommendations/activity',
      '/api/recommendations/wellness',
    ]) {
      const data = (await agent.get(endpoint)).body.data;
      expect(data.why.length).toBeGreaterThan(30);
    }
  });

  test('ai failure still produces a complete recommendation', async () => {
    const agent = await authAgent('hyb9@test.com');
    const res = await agent.get('/api/recommendations/nutrition');
    expect(res.status).toBe(200);
    expect(Object.values(res.body.data.plan.meals).every((m) => m.items.length)).toBe(true);
  });
});
