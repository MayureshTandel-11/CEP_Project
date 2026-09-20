const mongoose = require('mongoose');

const runSchema = new mongoose.Schema({
  modelType: { type: String, required: true },
  nSamples: { type: Number, required: true },
  accuracy: { type: Number, default: null },
  precision: { type: Number, default: null },
  recall: { type: Number, default: null },
  f1: { type: Number, default: null },
  promoted: { type: Boolean, default: false },
  notes: { type: String, default: '' },
}, { timestamps: true });

runSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    model_type: this.modelType,
    n_samples: this.nSamples,
    accuracy: this.accuracy,
    precision: this.precision,
    recall: this.recall,
    f1: this.f1,
    promoted: this.promoted,
    notes: this.notes,
    created_at: this.createdAt ? this.createdAt.toISOString() : null,
  };
};

module.exports = mongoose.model('MLTrainingRun', runSchema);
