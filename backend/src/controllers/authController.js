const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const LoginChallenge = require('../models/LoginChallenge');
const SignupChallenge = require('../models/SignupChallenge');
const notify = require('../utils/notify');
const { issueChallenge, consumeChallenge, shuffle } = require('../utils/challenge');
const { checkEmail } = require('../utils/validateEmail');
const { checkName, isPlaceholderName } = require('../utils/validateName');
const { checkPhone } = require('../utils/validatePhone');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Signing in never creates anything — you can only sign in to a profile that
// already exists (an Admin seeded by scripts/seedAdmin.js, or a Customer who
// signed up). Returns the profile, or null if there is none for this email.
const findProfile = async email => {
  const admin = await Admin.findOne({ email });
  if (admin) return { user: admin, role: 'admin' };
  const customer = await Customer.findOne({ email });
  if (customer) return { user: customer, role: 'customer' };
  return null;
};

const NO_PROFILE = {
  code: 'NO_PROFILE',
  message: "We couldn't find a profile for that email address. Create one to get started.",
};

// POST /api/auth/login/start — Body: { email, name }
// Emails the correct number, and returns a shuffled set of options
// (including the correct one) for the sign-in screen to display as buttons.
const start = async (req, res) => {
  // Trimmed + lowercased, and the domain must be able to receive mail — so a
  // typo can't send a sign-in code into the void.
  const check = await checkEmail(req.body.email);
  if (!check.ok) return res.status(400).json({ message: check.message, code: 'INVALID_EMAIL' });
  const email = check.email;

  const nameCheck = checkName(req.body.name);
  if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });

  try {
    // Checked before a code is sent, so someone without a profile is told to
    // sign up instead of waiting on an email that leads nowhere.
    if (!(await findProfile(email))) return res.status(404).json(NO_PROFILE);

    const challenge = await issueChallenge(LoginChallenge, email);
    if (!challenge.ok) return res.status(challenge.status).json({ message: challenge.message });

    const sent = await notify(
      email,
      `Your sign-in number is ${challenge.correctNumber}. On the sign-in screen, click the button showing this number. It expires in 5 minutes.`,
      'Your Haus of Defined Beauty sign-in code',
      'otp'
    );
    // Unlike other notify() calls, the email *is* the deliverable here — if
    // it didn't send, the options below are useless, so say so instead of
    // leaving the customer staring at buttons for a code that never arrives.
    if (!sent) return res.status(502).json({ message: 'Could not send the sign-in code email. Please try again.' });

    res.json({ options: shuffle(challenge.options) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login/verify — Body: { email, selected, name }
// Role is never taken from the client — it's whatever the existing profile
// is. Admin accounts are only ever created by scripts/seedAdmin.js.
const verify = async (req, res) => {
  const { selected } = req.body;
  const check = await checkEmail(req.body.email, { checkDomain: false });
  if (!check.ok) return res.status(400).json({ message: check.message, code: 'INVALID_EMAIL' });
  const nameCheck = checkName(req.body.name);
  if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });
  if (!selected) return res.status(400).json({ message: 'email and selected required' });
  const email = check.email;

  try {
    // Re-checked here, not just in start(), so hitting this route directly
    // can't conjure an account either.
    const profile = await findProfile(email);
    if (!profile) return res.status(404).json(NO_PROFILE);

    const result = await consumeChallenge(LoginChallenge, email, selected);
    if (!result.ok) return res.status(result.status).json({ message: result.message });

    const { user, role } = profile;
    // An account keeps the name it already has (change it from My Profile); the
    // typed name only replaces an auto-filled placeholder such as "Admin".
    if (isPlaceholderName(user.name)) {
      user.name = nameCheck.name;
      await user.save();
    }

    const token = signToken(user._id, role);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/signup/start — Body: { email, name, phone }
// Emails a number to prove the address is real. Nothing is written to the
// customer list until that number comes back (see signupVerify).
const signupStart = async (req, res) => {
  const check = await checkEmail(req.body.email);
  if (!check.ok) return res.status(400).json({ message: check.message, code: 'INVALID_EMAIL' });
  const email = check.email;

  const nameCheck = checkName(req.body.name);
  if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });

  const phoneCheck = checkPhone(req.body.phone);
  if (!phoneCheck.ok) return res.status(400).json({ message: phoneCheck.message, code: 'INVALID_PHONE' });

  try {
    if (await findProfile(email)) {
      return res.status(409).json({
        code: 'PROFILE_EXISTS',
        message: 'There is already a profile for that email address — sign in instead.',
      });
    }

    const challenge = await issueChallenge(SignupChallenge, email, {
      name: nameCheck.name,
      phone: phoneCheck.phone,
    });
    if (!challenge.ok) return res.status(challenge.status).json({ message: challenge.message });

    const sent = await notify(
      email,
      `Your sign-up number is ${challenge.correctNumber}. On the sign-up screen, click the button showing this number to confirm this email address. It expires in 5 minutes.`,
      'Confirm your Haus of Defined Beauty email',
      'otp'
    );
    if (!sent) return res.status(502).json({ message: 'Could not send the confirmation email. Please try again.' });

    res.json({ options: shuffle(challenge.options) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/signup/verify — Body: { email, selected }
// Creates the profile from the details held with the challenge — not from
// this request — so only details that came with the proven email are used.
// No token is returned: a new profile goes back to the sign-in screen.
const signupVerify = async (req, res) => {
  const { selected } = req.body;
  const check = await checkEmail(req.body.email, { checkDomain: false });
  if (!check.ok) return res.status(400).json({ message: check.message, code: 'INVALID_EMAIL' });
  if (!selected) return res.status(400).json({ message: 'email and selected required' });
  const email = check.email;

  try {
    if (await findProfile(email)) {
      return res.status(409).json({
        code: 'PROFILE_EXISTS',
        message: 'There is already a profile for that email address — sign in instead.',
      });
    }

    const result = await consumeChallenge(SignupChallenge, email, selected);
    if (!result.ok) return res.status(result.status).json({ message: result.message });

    const { name, phone } = result.record;
    const customer = await Customer.create({ email, name, phone });

    res.status(201).json({ created: true, user: { name: customer.name, email: customer.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Google OAuth callback — stub for future wiring
const googleCallback = async (req, res) => {
  res.status(501).json({ message: 'Google OAuth not yet configured' });
};

module.exports = { start, verify, signupStart, signupVerify, googleCallback };
