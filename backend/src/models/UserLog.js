const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  logDate: { type: String, required: true },
  weight: { type: Number, default: null },
  water: { type: Number, default: null },
  sleep: { type: Number, default: null },
  steps: { type: Number, default: null },
  exerciseMinutes: { type: Number, default: null },
  calories: { type: Number, default: null },
  mood: { type: Number, default: null },
  stress: { type: Number, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });

logSchema.index({ userId: 1, logDate: 1 }, { unique: true });

logSchema.methods.toPublic = function toPublic() {
  return {
    log_id: String(this._id),
    date: this.logDate,
    weight: this.weight,
    water: this.water,
    sleep: this.sleep,
    steps: this.steps,
    exercise_minutes: this.exerciseMinutes,
    calories: this.calories,
    mood: this.mood,
    stress: this.stress,
    notes: this.notes,
  };
};

module.exports = mongoose.model('UserLog', logSchema);
