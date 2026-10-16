const crypto = require('crypto');

/**
 * Deterministic holdout assignment: the same user always lands in the same arm, and the
 * assignment is independent of any health data. `fraction` is the share held out.
 */
function isControlUser(userId, fraction) {
  if (!(fraction > 0)) return false;
  if (fraction >= 1) return true;
  const digest = crypto.createHash('sha256').update(`ml-control:${String(userId)}`).digest();
  const u = digest.readUInt32BE(0) / 0x100000000; // uniform in [0, 1)
  return u < fraction;
}

async function hasResearchConsent(userId) {
  // Lazy require keeps pure helpers (and unit tests) free of the database layer.
  const { User } = require('../models');
  const user = await User.findById(userId).select('researchConsent');
  return Boolean(user && user.researchConsent);
}

module.exports = { isControlUser, hasResearchConsent };
