const crypto = require('crypto');

// The emailed-number challenge used by both signing in and signing up. The
// rules below (expiry, resend cooldown, attempt limit, one-time use) are the
// security of the whole passwordless flow, so they live in one place rather
// than being copied per route.
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;
const NUM_OPTIONS = 3;

const randomTwoDigit = () => String(crypto.randomInt(10, 100));

// Issues a fresh challenge for `email`, replacing any earlier one. `extra` is
// stored alongside it (sign-up keeps the pending name/phone there).
// -> { ok: true, options, correctNumber } | { ok: false, status, message }
async function issueChallenge(Model, email, extra = {}) {
  const recent = await Model.findOne({ email }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, status: 429, message: 'Please wait a minute before requesting another code' };
  }

  const numbers = new Set();
  while (numbers.size < NUM_OPTIONS) numbers.add(randomTwoDigit());
  const options = [...numbers];
  const correctNumber = options[crypto.randomInt(0, options.length)];

  await Model.deleteMany({ email });
  await Model.create({
    email,
    correctNumber,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    ...extra,
  });

  return { ok: true, options, correctNumber };
}

// Checks `selected` against the live challenge, burning it on success so a
// number can never be redeemed twice.
// -> { ok: true, record } | { ok: false, status, message }
async function consumeChallenge(Model, email, selected) {
  const record = await Model.findOne({ email }).sort({ createdAt: -1 });
  if (!record || record.expiresAt < new Date()) {
    return { ok: false, status: 400, message: 'Code expired or not found — request a new one' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, status: 429, message: 'Too many attempts — request a new code' };
  }
  if (record.correctNumber !== String(selected)) {
    record.attempts += 1;
    await record.save();
    return { ok: false, status: 400, message: "That's not the right number — try again" };
  }

  await Model.deleteOne({ _id: record._id });
  return { ok: true, record };
}

// The screen shows the options as buttons, so the right one can't always sit
// in the same place.
const shuffle = options => [...options].sort(() => Math.random() - 0.5);

module.exports = {
  issueChallenge,
  consumeChallenge,
  shuffle,
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  NUM_OPTIONS,
};
