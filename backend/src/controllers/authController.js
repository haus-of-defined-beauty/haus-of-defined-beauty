const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const LoginChallenge = require('../models/LoginChallenge');
const sendMail = require('../utils/mailer');

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;
const NUM_OPTIONS = 3;

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const randomTwoDigit = () => String(crypto.randomInt(10, 100));

// POST /api/auth/login/start — Body: { email, name }
// Emails the correct number, and returns a shuffled set of options
// (including the correct one) for the sign-in screen to display as buttons.
const start = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email required' });

  try {
    const recent = await LoginChallenge.findOne({ email }).sort({ createdAt: -1 });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: 'Please wait a minute before requesting another code' });
    }

    const numbers = new Set();
    while (numbers.size < NUM_OPTIONS) numbers.add(randomTwoDigit());
    const options = [...numbers];
    const correctNumber = options[crypto.randomInt(0, options.length)];

    await LoginChallenge.deleteMany({ email });
    await LoginChallenge.create({
      email,
      correctNumber,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    await sendMail(
      email,
      'Your Haus of Defined Beauty sign-in code',
      `Your sign-in number is ${correctNumber}. On the sign-in screen, click the button showing this number. It expires in 5 minutes.`
    );

    const shuffled = [...options].sort(() => Math.random() - 0.5);
    res.json({ options: shuffled });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login/verify — Body: { email, selected, name }
// Role is never taken from the client — it's derived from whether an Admin
// account already exists for this email. Admin accounts are never
// self-service created here; only a pre-provisioned Admin document (see
// backend/scripts/seedAdmin.js) can ever result in an admin login. Anyone
// else is treated as a customer, auto-created on first successful login.
const verify = async (req, res) => {
  const { email, selected, name } = req.body;
  if (!email || !selected) return res.status(400).json({ message: 'email and selected required' });

  try {
    const record = await LoginChallenge.findOne({ email }).sort({ createdAt: -1 });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Code expired or not found — request a new one' });
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many attempts — request a new code' });
    }
    if (record.correctNumber !== String(selected)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "That's not the right number — try again" });
    }

    await LoginChallenge.deleteOne({ _id: record._id }); // one-time use

    let user = await Admin.findOne({ email });
    let role = 'admin';
    let isNewAccount = false;
    if (user) {
      if (name) { user.name = name; await user.save(); }
    } else {
      role = 'customer';
      isNewAccount = !(await Customer.exists({ email }));
      user = await Customer.findOneAndUpdate(
        { email },
        { $setOnInsert: { email, name: name || 'Customer User' } },
        { upsert: true, new: true }
      );
    }

    const token = signToken(user._id, role);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role }, isNewAccount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Google OAuth callback — stub for future wiring
const googleCallback = async (req, res) => {
  res.status(501).json({ message: 'Google OAuth not yet configured' });
};

module.exports = { start, verify, googleCallback };
