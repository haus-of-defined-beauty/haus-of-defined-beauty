const Customer = require('../models/Customer');
const { checkName } = require('../utils/validateName');

const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.id).populate('bookingHistory');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Only name and phone can be changed here. The request body is never passed
// straight to the database, so nothing else on the account (email, etc.) can
// be overwritten from this endpoint.
const updateProfile = async (req, res) => {
  try {
    const patch = {};

    if ('name' in req.body) {
      const nameCheck = checkName(req.body.name);
      if (!nameCheck.ok) return res.status(400).json({ message: nameCheck.message, code: 'INVALID_NAME' });
      patch.name = nameCheck.name;
    }

    if ('phone' in req.body) {
      const phone = String(req.body.phone == null ? '' : req.body.phone).trim();
      if (phone.length > 30) return res.status(400).json({ message: 'That phone number is too long.' });
      patch.phone = phone;
    }

    const updated = await Customer.findByIdAndUpdate(req.user.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile };
