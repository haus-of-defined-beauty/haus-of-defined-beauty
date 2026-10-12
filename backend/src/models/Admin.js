const mongoose = require('mongoose');

const SERVICE_CATEGORIES = ['nails', 'lashes', 'makeup', 'hair'];

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String },
  googleId: { type: String },
  // Which services this admin actually works on. The salon runs one nail
  // artist and one hair/makeup/lash artist, so a slot opened by one of them
  // must not show up as availability for the other's services.
  // Defaults to everything, which keeps a single-admin salon working.
  specialties: {
    type: [{ type: String, enum: SERVICE_CATEGORIES }],
    default: () => [...SERVICE_CATEGORIES],
  },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
module.exports.SERVICE_CATEGORIES = SERVICE_CATEGORIES;
