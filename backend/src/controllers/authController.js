const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Dev-mode login: POST /api/auth/dev-login
// Body: { email, role: 'admin' | 'customer' }
// Creates the user if they don't exist yet — no password, no Google needed.
const devLogin = async (req, res) => {
  const { email, role, name } = req.body;
  if (!email || !role) return res.status(400).json({ message: 'email and role required' });

  try {
    let user;
    if (role === 'admin') {
      user = await Admin.findOneAndUpdate(
        { email },
        { $setOnInsert: { email, name: name || 'Admin User' } },
        { upsert: true, new: true }
      );
    } else {
      user = await Customer.findOneAndUpdate(
        { email },
        { $setOnInsert: { email, name: name || 'Customer User' } },
        { upsert: true, new: true }
      );
    }

    const token = signToken(user._id, role);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Google OAuth callback — stub for future wiring
const googleCallback = async (req, res) => {
  res.status(501).json({ message: 'Google OAuth not yet configured' });
};

module.exports = { devLogin, googleCallback };
