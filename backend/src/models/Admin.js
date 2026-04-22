const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
