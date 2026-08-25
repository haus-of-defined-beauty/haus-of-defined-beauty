const mongoose = require('mongoose');

const loginChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  correctNumber: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

// TTL index — MongoDB auto-deletes the document once expiresAt has passed.
loginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginChallenge', loginChallengeSchema);
