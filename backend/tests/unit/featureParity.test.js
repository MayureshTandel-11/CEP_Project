/**
 * JS side of the Python/JS feature-parity contract. The fixture is produced by
 * ai-ml/tests/make_feature_golden.py from the Python implementation; every case must be
 * reproduced exactly (Object.is equality, so no tolerance hides rounding drift).
 */
const fs = require('fs');
const path = require('path');
const { buildFeatureRow, buildMlFeatures, roundHalfUp, imputeRaw } = require('../../src/services/featureBuilder');

const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../../ai-ml/tests/fixtures/feature_golden.json'), 'utf8'));

describe('golden vectors (Python == JS)', () => {
  test('fixture is large enough', () => {
    expect(fixture.cases.length).toBeGreaterThanOrEqual(200);
  });

  test('every case matches exactly', () => {
    const mismatches = [];
    for (const c of fixture.cases) {
      const got = buildFeatureRow(c.raw);
      for (const [k, v] of Object.entries(c.expected)) {
        if (!Object.is(got[k], v)) mismatches.push({ id: c.id, feature: k, expected: v, got: got[k] });
      }
      expect(Object.keys(got).sort()).toEqual(Object.keys(c.expected).sort());
    }
    expect(mismatches).toEqual([]);
  });
});

describe('roundHalfUp', () => {
  test('ties round up, unlike banker rounding', () => {
    expect(roundHalfUp(0.8125, 3)).toBe(0.813);
    expect(roundHalfUp(2.5, 0)).toBe(3);
    expect(roundHalfUp(3.5, 0)).toBe(4);
  });
});

describe('buildMlFeatures null handling', () => {
  const profile = {
    age: 30, gender: 'female', weight_kg: 60, activity_level: 'moderate', goal: 'maintenance',
    sleep_hours: 8, water_intake_ml: 2200, stress_level: null,
  };
  const metrics = { bmi: 22, water_target_ml: 2500, calorie_target: 2000 };
  const summary = (o = {}) => ({
    avg_sleep: null, avg_water: null, avg_steps: null, avg_exercise_minutes: null,
    avg_calories: null, avg_stress: null, ...o,
  });

  test('a logged average of 0 stays 0 instead of falling back to the profile', () => {
    const f = buildMlFeatures(profile, metrics, summary({ avg_water: 0, avg_sleep: 0 }));
    expect(f.hydration_ratio).toBe(0);
    expect(f.sleep_hours).toBe(0);
  });

  test('null averages fall back to profile values', () => {
    const f = buildMlFeatures(profile, metrics, summary());
    expect(f.sleep_hours).toBe(8);
    expect(f.hydration_ratio).toBe(0.88);
  });

  test('averaged stress is rounded and clamped to 1..5', () => {
    expect(buildMlFeatures(profile, metrics, summary({ avg_stress: 2.6 })).stress_level).toBe(3);
    expect(buildMlFeatures(profile, metrics, summary({ avg_stress: 9 })).stress_level).toBe(5);
    expect(buildMlFeatures(profile, metrics, summary()).stress_level).toBe(3);
  });

  test('imputeRaw fills only missing values', () => {
    const r = imputeRaw({ sleep_hours: null, exercise_minutes: 0, water_target_ml: 3000 });
    expect(r.sleep_hours).toBe(7);
    expect(r.exercise_minutes).toBe(0);
    expect(r.water_ml).toBe(3000);
  });
});
