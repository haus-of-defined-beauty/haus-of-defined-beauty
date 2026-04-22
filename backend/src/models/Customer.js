const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  googleId: { type: String },
  email: { type: String },
  bookingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
