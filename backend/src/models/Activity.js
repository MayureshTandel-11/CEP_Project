const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  activityName: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  duration: { type: Number, required: true },
  caloriesBurned: { type: Number, required: true },
  difficulty: { type: String, required: true, index: true },
  intensity: { type: String, required: true, default: 'moderate' },
  description: { type: String, default: '' },
}, { timestamps: true });

activitySchema.methods.toPublic = function toPublic() {
  return {
    activity_id: String(this._id),
    activity_name: this.activityName,
    category: this.category,
    duration: this.duration,
    calories_burned: this.caloriesBurned,
    difficulty: this.difficulty,
    intensity: this.intensity,
    description: this.description,
  };
};

module.exports = mongoose.model('Activity', activitySchema);
