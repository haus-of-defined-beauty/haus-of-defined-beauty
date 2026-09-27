const Admin = require('../models/Admin');
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

// Admins can change their display name only (the email is what identifies the
// admin account, and is set when the account is provisioned).
const updateProfile = async (req, res) => {
  try {
    const nameCheck = checkName(req.body.name);
    if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });

    const updated = await Admin.findByIdAndUpdate(req.user.id, { name: nameCheck.name }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Admin not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile };
