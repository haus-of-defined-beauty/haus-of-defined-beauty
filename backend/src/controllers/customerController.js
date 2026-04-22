const Customer = require('../models/Customer');

const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.id).populate('bookingHistory');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile };
