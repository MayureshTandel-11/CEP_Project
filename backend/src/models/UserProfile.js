const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  heightCm: { type: Number, required: true },
  weightKg: { type: Number, required: true },
  activityLevel: { type: String, required: true },
  foodPreference: { type: String, required: true },
  allergies: { type: [String], default: [] },
  sleepHours: { type: Number, required: true, default: 7 },
  goal: { type: String, required: true },
  workType: { type: String, default: null },
  sittingHours: { type: Number, default: null },
  waterIntakeMl: { type: Number, default: null },
  stressLevel: { type: Number, default: null },
  foodDislikes: { type: [String], default: [] },
  mealFrequency: { type: Number, default: null },
  budget: { type: String, default: null },
  medical_history: {
    has_conditions: { type: Boolean, default: false },
    conditions: { type: [String], default: [] },
    other_condition: { type: String, default: '' },
    medications: { type: [String], default: [] },
    relevant_notes: { type: String, default: '' },
  },
}, { timestamps: true });

profileSchema.virtual('allergy_list').get(function allergyList() {
  return this.allergies || [];
});
profileSchema.virtual('dislike_list').get(function dislikeList() {
  return this.foodDislikes || [];
});

profileSchema.methods.asEngine = function asEngine() {
  return {
    age: this.age,
    gender: this.gender,
    height_cm: this.heightCm,
    weight_kg: this.weightKg,
    activity_level: this.activityLevel,
    food_preference: this.foodPreference,
    allergy_list: this.allergies || [],
    dislike_list: this.foodDislikes || [],
    sleep_hours: this.sleepHours,
    goal: this.goal,
    work_type: this.workType,
    sitting_hours: this.sittingHours,
    water_intake_ml: this.waterIntakeMl,
    stress_level: this.stressLevel,
    food_dislikes: this.foodDislikes || [],
    meal_frequency: this.mealFrequency,
    budget: this.budget,
    medical_history: this.medical_history
      ? {
          has_conditions: this.medical_history.has_conditions || false,
          conditions: this.medical_history.conditions || [],
          other_condition: this.medical_history.other_condition || '',
          medications: this.medical_history.medications || [],
          relevant_notes: this.medical_history.relevant_notes || '',
        }
      : { has_conditions: false, conditions: [], other_condition: '', medications: [], relevant_notes: '' },
  };
};

profileSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    user_id: String(this.userId),
    age: this.age,
    gender: this.gender,
    height_cm: this.heightCm,
    weight_kg: this.weightKg,
    activity_level: this.activityLevel,
    food_preference: this.foodPreference,
    allergies: this.allergies || [],
    sleep_hours: this.sleepHours,
    goal: this.goal,
    work_type: this.workType,
    sitting_hours: this.sittingHours,
    water_intake_ml: this.waterIntakeMl,
    stress_level: this.stressLevel,
    food_dislikes: this.foodDislikes || [],
    meal_frequency: this.mealFrequency,
    budget: this.budget,
    medical_history: this.medical_history
      ? {
          has_conditions: this.medical_history.has_conditions || false,
          conditions: this.medical_history.conditions || [],
          other_condition: this.medical_history.other_condition || '',
          medications: this.medical_history.medications || [],
          relevant_notes: this.medical_history.relevant_notes || '',
        }
      : { has_conditions: false, conditions: [], other_condition: '', medications: [], relevant_notes: '' },
    updated_at: this.updatedAt ? this.updatedAt.toISOString() : null,
  };
};

module.exports = mongoose.model('UserProfile', profileSchema);
