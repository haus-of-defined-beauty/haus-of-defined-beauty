const crypto = require('crypto');

// The emailed-code challenge used by both signing in and signing up. The
// rules below (expiry, resend cooldown, attempt limit, one-time use) are the
// security of the whole passwordless flow, so they live in one place rather
// than being copied per route.
//
// This used to email one of three two-digit numbers and ask the person to
// click the matching button. Three options and three attempts meant anyone
// holding only an email address could simply press all three and always get
// in — the challenge proved nothing. A typed six-digit code is one guess in
// 900,000, and the attempt limit below burns the challenge rather than
// letting it be worked through.
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;
const CODE_DIGITS = 6;

const randomCode = () => String(crypto.randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, '0');

// Issues a fresh challenge for `email`, replacing any earlier one. `extra` is
// stored alongside it (sign-up keeps the pending name/phone there).
// -> { ok: true, code } | { ok: false, status, message }
async function issueChallenge(Model, email, extra = {}) {
  const recent = await Model.findOne({ email }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, status: 429, message: 'Please wait a minute before requesting another code' };
  }

  const code = randomCode();

  await Model.deleteMany({ email });
  await Model.create({
    email,
    correctNumber: code,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    ...extra,
  });

  return { ok: true, code };
}

// Checks a submitted code against the live challenge, burning it on success
// so it can never be redeemed twice. Once the attempts are used up the
// challenge is destroyed too, so a wrong guesser has to request a new email
// rather than keep working through possibilities.
// -> { ok: true, record } | { ok: false, status, message }
async function consumeChallenge(Model, email, submitted) {
  const record = await Model.findOne({ email }).sort({ createdAt: -1 });
  if (!record || record.expiresAt < new Date()) {
    return { ok: false, status: 400, message: 'That code has expired or was never sent — request a new one.' };
  }

  const given = String(submitted == null ? '' : submitted).replace(/\s/g, '');

  // Compared without short-circuiting on the first differing digit, so the
  // time taken doesn't leak how much of the code was right.
  const expected = record.correctNumber;
  const same = given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

  if (!same) {
    record.attempts += 1;
    const left = MAX_ATTEMPTS - record.attempts;
    if (left <= 0) {
      await Model.deleteOne({ _id: record._id });
      return { ok: false, status: 429, message: 'Too many incorrect codes — request a new one.' };
    }
    await record.save();
    return {
      ok: false,
      status: 400,
      message: `That code isn't right — ${left} attempt${left === 1 ? '' : 's'} left.`,
    };
  }

  await Model.deleteOne({ _id: record._id });
  return { ok: true, record };
}

module.exports = {
  issueChallenge,
  consumeChallenge,
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  CODE_DIGITS,
};
