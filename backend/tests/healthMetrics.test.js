const {
  calculateBmi, calculateBmr, calculateCalorieTarget, calculateMacros,
  calculateTdee, calculateWaterTarget, classifyBmi,
} = require('../src/services/healthMetricsService');
const authAgent = (email) => global.authAgent(email);

describe('health metrics', () => {
  test('bmi formula', () => {
    expect(calculateBmi(70, 175)).toBe(22.86);
  });

  test.each([
    [17.0, 'Underweight'], [18.5, 'Normal'], [22.0, 'Normal'],
    [25.0, 'Overweight'], [27.5, 'Overweight'], [30.0, 'Obese'], [41.0, 'Obese'],
  ])('bmi %s -> %s', (bmi, expected) => {
    expect(classifyBmi(bmi)).toBe(expected);
  });

  test('bmr male matches mifflin-st jeor', () => {
    expect(calculateBmr(70, 175, 25, 'male')).toBe(1673.75);
  });

  test('bmr female matches mifflin-st jeor', () => {
    expect(calculateBmr(60, 165, 30, 'female')).toBe(1320.25);
  });

  test('tdee applies activity multiplier', () => {
    expect(calculateTdee(1673.75, 'sedentary')).toBe(Math.round(1673.75 * 1.2 * 100) / 100);
    expect(calculateTdee(1673.75, 'active')).toBe(Math.round(1673.75 * 1.725 * 100) / 100);
  });

  test('weight loss target is a moderate deficit', () => {
    const target = calculateCalorieTarget(2400, 'weight_loss', 'male');
    expect(target).toBe(2040);
    expect(target).toBeGreaterThan(2400 * 0.8);
  });

  test('calorie target never drops below safety floor', () => {
    expect(calculateCalorieTarget(1000, 'weight_loss', 'female')).toBe(1200);
    expect(calculateCalorieTarget(1000, 'weight_loss', 'male')).toBe(1500);
  });

  test('macros roughly add up', () => {
    const macros = calculateMacros(2000, 70, 'maintain_weight');
    const kcal = macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9;
    expect(Math.abs(kcal - 2000)).toBeLessThanOrEqual(60);
  });

  test('water target scales', () => {
    expect(calculateWaterTarget(70, 'sedentary')).toBe(2450);
    expect(calculateWaterTarget(70, 'active')).toBe(3200);
  });

  test('health metrics endpoint', async () => {
    const agent = await authAgent('metrics@test.com');
    const res = await agent.get('/api/health-metrics');
    expect(res.status).toBe(200);
    for (const key of ['bmi', 'bmi_category', 'bmr', 'tdee', 'calorie_target', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'water_target_ml']) {
      expect(res.body.data[key]).not.toBeNull();
    }
    expect(res.body.data.disclaimer.toLowerCase()).toContain('not a medical');
  });
});
