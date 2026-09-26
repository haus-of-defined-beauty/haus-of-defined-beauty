const MasterclassApplication = require('../models/MasterclassApplication');
const Admin = require('../models/Admin');
const notify = require('../utils/notify');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const n = String(name || '').trim();
    const s = String(surname || '').trim();
    const e = String(email || '').trim().toLowerCase();

    if (!n || !s) return res.status(400).json({ message: 'Please enter your name and surname.' });
    if (n.length > 80 || s.length > 80) return res.status(400).json({ message: 'Your name is too long.' });
    if (!EMAIL_RE.test(e) || e.length > 254) return res.status(400).json({ message: 'Please enter a valid email address.' });

    if (overLimit(req.ip)) {
      return res.status(429).json({ message: 'Too many applications from this connection. Please try again later.' });
    }

    await MasterclassApplication.create({ name: n, surname: s, email: e });

    const admins = await Admin.find().select('email');
    admins.forEach(a => notify(a.email, `New masterclass application from ${n} ${s} (${e}).`));

    res.status(201).json({ message: 'Application received' });
  } catch (err) {
    console.error('[MASTERCLASS] apply failed:', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

module.exports = { apply };
