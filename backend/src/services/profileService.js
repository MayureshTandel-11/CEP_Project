const { UserProfile } = require('../models');
const { NotFoundError } = require('../utils/errors');
const {
  normaliseTagList, validateActivityLevel, validateFoodPreference,
  validateGender, validateGoal, validateInt, validateNumber, validateRequired,
} = require('../utils/validators');

const REQUIRED_FIELDS = [
  'age', 'gender', 'height_cm', 'weight_kg', 'activity_level',
  'food_preference', 'sleep_hours', 'goal',
];

const MAX_CONDITIONS = 20;
const MAX_MEDICATIONS = 20;
const MAX_TEXT_LENGTH = 500;

/** Trim a string and hard-cap its length. Returns '' for non-strings. */
function safeStr(value, maxLen = MAX_TEXT_LENGTH) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLen);
}

/**
 * Clean and validate the optional medical_history block.
 * Returns a safe object regardless of what was provided.
 * Never throws — treat missing/invalid data as "no conditions".
 */
function cleanMedicalHistory(raw) {
  if (!raw || typeof raw !== 'object') {
    return { has_conditions: false, conditions: [], other_condition: '', medications: [], relevant_notes: '' };
  }
  const has_conditions = raw.has_conditions === true || raw.has_conditions === 'true';
  let conditions = [];
  if (has_conditions && Array.isArray(raw.conditions)) {
    conditions = raw.conditions
      .map((c) => safeStr(c, 100))
      .filter(Boolean)
      .slice(0, MAX_CONDITIONS);
  }
  const other_condition = has_conditions ? safeStr(raw.other_condition, 200) : '';
  let medications = [];
  if (Array.isArray(raw.medications)) {
    medications = raw.medications
      .map((m) => safeStr(m, 100))
      .filter(Boolean)
      .slice(0, MAX_MEDICATIONS);
  }
  const relevant_notes = safeStr(raw.relevant_notes, MAX_TEXT_LENGTH);
  return { has_conditions, conditions, other_condition, medications, relevant_notes };
}

function clean(data) {
  validateRequired(data, REQUIRED_FIELDS);
  return {
    age: validateInt(data.age, 'age'),
    gender: validateGender(data.gender),
    heightCm: validateNumber(data.height_cm, 'height_cm'),
    weightKg: validateNumber(data.weight_kg, 'weight_kg'),
    activityLevel: validateActivityLevel(data.activity_level),
    foodPreference: validateFoodPreference(data.food_preference),
    allergies: normaliseTagList(data.allergies),
    sleepHours: validateNumber(data.sleep_hours, 'sleep_hours'),
    goal: validateGoal(data.goal),
    workType: data.work_type || null,
    sittingHours: validateNumber(data.sitting_hours, 'sitting_hours', false),
    waterIntakeMl: validateInt(data.water_intake_ml, 'water_intake_ml', false),
    stressLevel: validateInt(data.stress_level, 'stress_level', false),
    foodDislikes: normaliseTagList(data.food_dislikes),
    mealFrequency: validateInt(data.meal_frequency, 'meal_frequency', false),
    budget: data.budget || null,
    medical_history: cleanMedicalHistory(data.medical_history),
  };
}

async function upsertProfile(userId, data) {
  const cleaned = clean(data);
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: { userId, ...cleaned } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return profile;
}

async function getProfile(userId) {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('Please complete your profile first.', 'PROFILE_REQUIRED');
  }
  return profile;
}

async function getProfileOrNone(userId) {
  return UserProfile.findOne({ userId });
}

module.exports = { REQUIRED_FIELDS, upsertProfile, getProfile, getProfileOrNone };
