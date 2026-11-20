/** Two separate default-off consents; the provider profile is an allowlist. */
const express = require('express');
const request = require('supertest');

jest.mock('../../src/models', () => ({ User: { findById: jest.fn() }, UserProfile: { findOne: jest.fn() } }));

const { User } = require('../../src/models');
const { errorHandler } = require('../../src/middleware/errorHandler');
const authRoutes = require('../../src/routes/authRoutes');
const {
  ageBand, buildProviderProfile, NO_CONSENT, CONDITION_CATEGORIES, getAiConsent,
} = require('../../src/services/consentService');

function userDoc(over = {}) {
  const doc = {
    externalAiConsent: false, medicalDataConsent: false, externalAiConsentAt: null, medicalDataConsentAt: null,
    save: jest.fn(async () => doc), ...over,
  };
  return doc;
}
const app = () => {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => { req.session = { userId: 'u1' }; next(); });
  a.use('/api/auth', authRoutes);
  a.use(errorHandler);
  return a;
};
const put = (body) => request(app()).put('/api/auth/ai-consent').send(body);

describe('PUT /api/auth/ai-consent', () => {
  test('both consents default to off', async () => {
    expect(await getAiConsent('u1')).toEqual({ external_ai: false, medical_data: false });
    User.findById.mockResolvedValue(userDoc());
    expect(await getAiConsent('u1')).toEqual(NO_CONSENT);
  });

  test('external AI can be turned on alone', async () => {
    const doc = userDoc(); User.findById.mockResolvedValue(doc);
    const res = await put({ external_ai: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ external_ai_consent: true, medical_data_consent: false });
    expect(doc.externalAiConsentAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalled();
  });

  test('medical data cannot be enabled while external AI is off', async () => {
    const doc = userDoc(); User.findById.mockResolvedValue(doc);
    const res = await put({ medical_data: true });
    expect(res.status).toBe(422);
    expect(doc.medicalDataConsent).toBe(false);
    expect(doc.save).not.toHaveBeenCalled();
    expect((await put({ external_ai: false, medical_data: true })).status).toBe(422);
  });

  test('both can be turned on together', async () => {
    const doc = userDoc(); User.findById.mockResolvedValue(doc);
    const res = await put({ external_ai: true, medical_data: true });
    expect(res.body.data).toEqual({ external_ai_consent: true, medical_data_consent: true });
  });

  test('withdrawing external AI also withdraws medical-data consent, even when only external is sent', async () => {
    const doc = userDoc({ externalAiConsent: true, medicalDataConsent: true, externalAiConsentAt: new Date(), medicalDataConsentAt: new Date() });
    User.findById.mockResolvedValue(doc);
    const res = await put({ external_ai: false });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ external_ai_consent: false, medical_data_consent: false });
    expect(doc.medicalDataConsentAt).toBeNull();
    expect(doc.externalAiConsentAt).toBeNull();
  });

  test('withdrawing medical data alone keeps external AI on', async () => {
    const doc = userDoc({ externalAiConsent: true, medicalDataConsent: true });
    User.findById.mockResolvedValue(doc);
    expect((await put({ medical_data: false })).body.data).toEqual({ external_ai_consent: true, medical_data_consent: false });
  });

  test('stored medical consent without external AI is ineffective', async () => {
    User.findById.mockResolvedValue(userDoc({ externalAiConsent: false, medicalDataConsent: true }));
    expect(await getAiConsent('u1')).toEqual({ external_ai: false, medical_data: false });
  });

  test.each([{}, { external_ai: 'yes' }, { medical_data: 1 }, { external_ai: null }])('invalid body %j is 422', async (body) => {
    User.findById.mockResolvedValue(userDoc());
    expect((await put(body)).status).toBe(422);
  });
});

describe('buildProviderProfile allowlist', () => {
  const profile = {
    age: 73, gender: 'female', goal: 'weight_loss', activity_level: 'light', food_preference: 'vegan',
    allergy_list: ['peanut'], dislike_list: ['okra'], work_type: 'WORK_X', sitting_hours: 11.3,
    stress_level: 4, meal_frequency: 5, budget: 'BUDGET_X', sleep_hours: 6.1,
    medical_history: {
      has_conditions: true, conditions: ['Asthma', 'Other', 'Made Up Condition'], other_condition: 'OTHER_COND_X',
      medications: ['METFORMIN_X'], relevant_notes: 'SECRET_NOTE',
    },
  };
  const metrics = { bmi: 27.31, bmi_category: 'Overweight', calorie_target: 1800, protein_g: 90, water_target_ml: 2400 };
  const summary = { count: 4, avg_sleep: 6.234, avg_water: 1500.4, avg_steps: 5000.6, avg_exercise_minutes: 20, avg_calories: 1700, avg_mood: 3.55 };

  test('no consent: no condition data and no excluded field', () => {
    const text = JSON.stringify(buildProviderProfile(profile, metrics, summary, NO_CONSENT));
    for (const banned of ['WORK_X', 'BUDGET_X', 'SECRET_NOTE', 'METFORMIN_X', 'OTHER_COND_X', '27.31', 'female', '73', 'Asthma', 'stress', 'sitting', 'meal_frequency']) {
      expect(text).not.toContain(banned);
    }
    expect(JSON.parse(text).condition_categories).toEqual([]);
  });

  test('external AI only: still no condition categories', () => {
    expect(buildProviderProfile(profile, metrics, summary, { external_ai: true, medical_data: false }).condition_categories).toEqual([]);
  });

  test('both consents: only enumerated categories (never Other, notes, medications or unknown text)', () => {
    const out = buildProviderProfile(profile, metrics, summary, { external_ai: true, medical_data: true });
    expect(out.condition_categories).toEqual(['Asthma']);
    const text = JSON.stringify(out);
    for (const banned of ['SECRET_NOTE', 'METFORMIN_X', 'OTHER_COND_X', 'Made Up Condition']) expect(text).not.toContain(banned);
  });

  test('medical consent without external AI is ignored', () => {
    expect(buildProviderProfile(profile, metrics, summary, { external_ai: false, medical_data: true }).condition_categories).toEqual([]);
  });

  test('has_conditions false sends nothing even with consent', () => {
    const p = { ...profile, medical_history: { ...profile.medical_history, has_conditions: false } };
    expect(buildProviderProfile(p, metrics, summary, { external_ai: true, medical_data: true }).condition_categories).toEqual([]);
  });

  test('values are banded and rounded', () => {
    const out = buildProviderProfile(profile, metrics, summary, NO_CONSENT);
    expect(out.age_band).toBe('60+');
    expect(out.seven_day_average).toMatchObject({ sleep_hours: 6.2, water_ml: 1500, steps: 5001, mood: 3.6, days_logged: 4 });
  });

  test('ageBand edge cases', () => {
    expect(ageBand(null)).toBe('unknown');
    expect(ageBand(undefined)).toBe('unknown');
    expect(ageBand('x')).toBe('unknown');
    expect([ageBand(17), ageBand(18), ageBand(29), ageBand(30), ageBand(44), ageBand(45), ageBand(59), ageBand(60)])
      .toEqual(['under 18', '18-29', '18-29', '30-44', '30-44', '45-59', '45-59', '60+']);
  });

  test('the sendable condition list matches the 13 form options', () => {
    expect(CONDITION_CATEGORIES).toHaveLength(13);
  });
});
