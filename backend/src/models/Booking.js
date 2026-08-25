const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
  },
  notes: { type: String },
  wasRescheduled: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
