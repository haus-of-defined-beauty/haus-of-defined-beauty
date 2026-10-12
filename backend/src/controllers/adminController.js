const Admin = require('../models/Admin');
const { SERVICE_CATEGORIES } = require('../models/Admin');
const { checkName } = require('../utils/validateName');

const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admins can change their display name and which services they work on (the
// email is what identifies the admin account, and is set when the account is
// provisioned). Specialties decide whose availability a customer is offered,
// so they're deliberately editable here rather than only in a seed script.
const updateProfile = async (req, res) => {
  try {
    const nameCheck = checkName(req.body.name);
    if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });

    const patch = { name: nameCheck.name };

    if ('specialties' in req.body) {
      const wanted = Array.isArray(req.body.specialties) ? req.body.specialties : [];
      const invalid = wanted.filter(c => !SERVICE_CATEGORIES.includes(c));
      if (invalid.length) {
        return res.status(400).json({ message: `Unknown service type: ${invalid.join(', ')}`, code: 'INVALID_SPECIALTY' });
      }
      if (!wanted.length) {
        return res.status(400).json({
          message: 'Choose at least one service type — otherwise none of your availability can be booked.',
          code: 'INVALID_SPECIALTY',
        });
      }
      patch.specialties = [...new Set(wanted)];
    }

    const updated = await Admin.findByIdAndUpdate(req.user.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Admin not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile, SERVICE_CATEGORIES };
