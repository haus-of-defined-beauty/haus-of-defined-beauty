const mongoose = require('mongoose');

// A sign-up waiting on its email to be proven: the number that was emailed,
// plus the profile details to create once it is. Deliberately a separate
// collection from LoginChallenge so a number issued for signing up can never
// be redeemed as a sign-in (or the other way round), and so pending details
// for someone who never finishes only live here, not on a real profile.
const signupChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  correctNumber: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

// TTL index — MongoDB auto-deletes the document once expiresAt has passed.
signupChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SignupChallenge', signupChallengeSchema);
