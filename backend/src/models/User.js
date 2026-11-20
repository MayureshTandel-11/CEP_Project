const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  // Opt-in to the use of this user's data for model evaluation / holdout. Default: no.
  researchConsent: { type: Boolean, default: false },
  researchConsentAt: { type: Date, default: null },
  // Two separate, default-off consents for sending data to an external AI provider.
  // Medical-data consent is only valid while external-AI consent is on.
  externalAiConsent: { type: Boolean, default: false },
  externalAiConsentAt: { type: Date, default: null },
  medicalDataConsent: { type: Boolean, default: false },
  medicalDataConsentAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.methods.toPublic = function toPublic(hasProfile = false) {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    created_at: this.createdAt ? this.createdAt.toISOString() : null,
    has_profile: hasProfile,
    research_consent: Boolean(this.researchConsent),
    external_ai_consent: Boolean(this.externalAiConsent),
    medical_data_consent: Boolean(this.externalAiConsent && this.medicalDataConsent),
  };
};

module.exports = mongoose.model('User', userSchema);
