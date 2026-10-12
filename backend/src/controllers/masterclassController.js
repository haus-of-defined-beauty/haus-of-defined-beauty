const MasterclassApplication = require('../models/MasterclassApplication');
const Admin = require('../models/Admin');
const notify = require('../utils/notify');
const { checkEmail } = require('../utils/validateEmail');
const { checkName } = require('../utils/validateName');

// Public endpoint, so cap how many applications one connection can send.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function overLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

// POST /api/masterclass/apply — Body: { name, surname, email, website }
// `website` is a hidden honeypot field: real visitors never fill it in, bots
// usually do — those get a fake success and nothing is saved.
const apply = async (req, res) => {
  try {
    const { name, surname, email, website } = req.body;
    if (website) return res.status(201).json({ message: 'Application received' });

    const nameCheck = checkName(name, 'name');
    if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });
    const surnameCheck = checkName(surname, 'surname');
    if (!surnameCheck.ok) return res.status(400).json({ message: surnameCheck.message, code: 'INVALID_SURNAME' });
    const n = nameCheck.name;
    const s = surnameCheck.name;

    const check = await checkEmail(email);
    if (!check.ok) return res.status(400).json({ message: check.message, code: 'INVALID_EMAIL' });
    const e = check.email;

    if (overLimit(req.ip)) {
      return res.status(429).json({ message: 'Too many applications from this connection. Please try again later.' });
    }

    // One application per email — the same person submitting twice left the
    // admin deciding which of two identical rows to act on.
    if (await MasterclassApplication.exists({ email: e })) {
      return res.status(409).json({
        code: 'ALREADY_APPLIED',
        message: 'There is already a masterclass application for that email address. We will be in touch soon.',
      });
    }

    await MasterclassApplication.create({ name: n, surname: s, email: e });

    const admins = await Admin.find().select('email');
    // Awaited: a serverless function is frozen once it responds, so emails still
    // in flight at that point would never be sent. notify() never throws.
    await Promise.all(admins.map(a => notify(a.email, `New masterclass application from ${n} ${s} (${e}).`)));

    res.status(201).json({ message: 'Application received' });
  } catch (err) {
    console.error('[MASTERCLASS] apply failed:', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// GET /api/masterclass/applications — the admin-side list. Newest first,
// since the admin works through whatever has just come in.
const listApplications = async (req, res) => {
  try {
    const applications = await MasterclassApplication.find().sort('-createdAt');
    res.json(applications.map(a => ({
      id: a._id,
      name: a.name,
      surname: a.surname,
      email: a.email,
      appliedAt: a.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { apply, listApplications };
