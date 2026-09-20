const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recommendationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recommendation', default: null },
  rating: { type: Number, required: true },
  followedPlan: { type: Boolean, default: false },
  weightChange: { type: Number, default: null },
  stepsChange: { type: Number, default: null },
  sleepChange: { type: Number, default: null },
  moodChange: { type: Number, default: null },
  comment: { type: String, default: '' },
}, { timestamps: true });

feedbackSchema.methods.toPublic = function toPublic() {
  return {
    feedback_id: String(this._id),
    recommendation_id: this.recommendationId ? String(this.recommendationId) : null,
    rating: this.rating,
    followed_plan: this.followedPlan,
    weight_change: this.weightChange,
    steps_change: this.stepsChange,
    sleep_change: this.sleepChange,
    mood_change: this.moodChange,
    comment: this.comment,
    created_at: this.createdAt ? this.createdAt.toISOString() : null,
  };
};

module.exports = mongoose.model('Feedback', feedbackSchema);
