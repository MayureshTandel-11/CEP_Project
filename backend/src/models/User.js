const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

userSchema.methods.toPublic = function toPublic(hasProfile = false) {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    created_at: this.createdAt ? this.createdAt.toISOString() : null,
    has_profile: hasProfile,
  };
};

module.exports = mongoose.model('User', userSchema);
