/**
 * What may leave this server for an external AI provider, and only with consent.
 *
 * Two separate, default-off consents live on the User:
 *   external_ai   - the user agrees that limited profile data is sent to an AI provider.
 *   medical_data  - additionally agrees that diagnosed condition CATEGORIES are sent.
 *                   It needs external_ai, and withdrawing external_ai withdraws both.
 *
 * Provider prompts are built ONLY from buildProviderProfile(), an explicit allowlist.
 * Free text (medical notes, "other condition", the work-type field), medications, exact
 * age, gender, the BMI value, budget, stress, sitting hours and meal frequency are never
 * sent. Anything not named here cannot reach a provider by accident.
 */
const { User } = require('../models');

// The condition choices offered in the profile form. Only these labels can be sent, and
// 'Other' is excluded because its meaning lives in free text that is never sent.
const CONDITION_CATEGORIES = [
  'Diabetes (Type 1 or Type 2)',
  'Hypertension (High Blood Pressure)',
  'High Cholesterol',
  'Thyroid Condition',
  'PCOS / PCOD',
  'Anemia',
  'Heart Disease',
  'Kidney Disease',
  'Liver Disease',
  'Asthma',
  'Gastrointestinal Condition',
  'Food-Related Medical Restriction',
  'Other',
];
const SENDABLE_CONDITIONS = CONDITION_CATEGORIES.filter((c) => c !== 'Other');

const NO_CONSENT = Object.freeze({ external_ai: false, medical_data: false });

async function getAiConsent(userId) {
  const user = await User.findById(userId);
  if (!user) return { ...NO_CONSENT };
  const external = Boolean(user.externalAiConsent);
  return { external_ai: external, medical_data: external && Boolean(user.medicalDataConsent) };
}

function ageBand(age) {
  const n = Number(age);
  if (age === null || age === undefined || age === '' || !Number.isFinite(n)) return 'unknown';
  if (n < 18) return 'under 18';
  if (n < 30) return '18-29';
  if (n < 45) return '30-44';
  if (n < 60) return '45-59';
  return '60+';
}

const clampText = (value, max = 40) => String(value ?? '').trim().slice(0, max);
const tagList = (list) => (Array.isArray(list) ? list : []).map((t) => clampText(t)).filter(Boolean).slice(0, 20);
const rounded = (value, digits = 0) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * 10 ** digits) / 10 ** digits
    : null
);

/**
 * The only data a provider prompt is built from. `profile` is profile.asEngine().
 */
function buildProviderProfile(profile, metrics, summary, consent = NO_CONSENT) {
  const out = {
    age_band: ageBand(profile.age),
    goal: clampText(profile.goal),
    activity_level: clampText(profile.activity_level),
    food_preference: clampText(profile.food_preference),
    allergies: tagList(profile.allergy_list),
    dislikes: tagList(profile.dislike_list || profile.food_dislikes),
    bmi_category: clampText(metrics && metrics.bmi_category),
    targets: {
      calories_kcal: rounded(metrics && metrics.calorie_target),
      protein_g: rounded(metrics && metrics.protein_g),
      water_ml: rounded(metrics && metrics.water_target_ml),
    },
    seven_day_average: {
      sleep_hours: rounded(summary && summary.avg_sleep, 1),
      water_ml: rounded(summary && summary.avg_water),
      steps: rounded(summary && summary.avg_steps),
      exercise_minutes: rounded(summary && summary.avg_exercise_minutes),
      calories_kcal: rounded(summary && summary.avg_calories),
      mood: rounded(summary && summary.avg_mood, 1),
      days_logged: (summary && summary.count) || 0,
    },
    condition_categories: [],
  };
  if (consent.external_ai && consent.medical_data) {
    const chosen = (profile.medical_history && profile.medical_history.has_conditions
      && Array.isArray(profile.medical_history.conditions)) ? profile.medical_history.conditions : [];
    out.condition_categories = SENDABLE_CONDITIONS.filter((c) => chosen.includes(c));
  }
  return out;
}

module.exports = {
  CONDITION_CATEGORIES, SENDABLE_CONDITIONS, NO_CONSENT, getAiConsent, ageBand, buildProviderProfile,
};
