const VALID_PROFILE = global.VALID_PROFILE;
const authAgent = (email) => global.authAgent(email);

describe('nutrition and activity', () => {
  test('allergy vegetarian vegan dislike filters', async () => {
    const agent = await authAgent('nut1@test.com');
    await agent.put('/api/profile').send({ ...VALID_PROFILE, food_preference: 'vegan', allergies: ['peanut'], food_dislikes: ['banana'] });
    const plan = (await agent.get('/api/recommendations/nutrition')).body.data.plan;
    const items = Object.values(plan.meals).flatMap((m) => m.items);
    expect(items.every((i) => i.vegan)).toBe(true);
    expect(items.every((i) => !i.allergen_tags.includes('peanut'))).toBe(true);
    expect(items.every((i) => !i.food_name.toLowerCase().includes('banana'))).toBe(true);
  });

  test('weekly plan has rest days and no consecutive high for sedentary', async () => {
    const agent = await authAgent('act1@test.com');
    await agent.put('/api/profile').send({ ...VALID_PROFILE, activity_level: 'sedentary' });
    const days = (await agent.get('/api/recommendations/activity/weekly')).body.data.plan.days;
    expect(days).toHaveLength(7);
    expect(days.every((d) => d.difficulty === 'easy')).toBe(true);
    expect(days.filter((d) => d.is_rest_day).length).toBeGreaterThanOrEqual(1);
  });
});
