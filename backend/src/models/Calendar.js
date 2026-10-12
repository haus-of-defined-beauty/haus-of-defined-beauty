const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  slots: [{
    start: { type: String, required: true }, // "HH:MM"
    end: { type: String, required: true },   // "HH:MM"
    status: { type: String, enum: ['available', 'booked', 'blocked'], default: 'available' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    // The admin who opened this slot. Their specialties decide which
    // services it can be booked for, so the nail artist's availability
    // can't be booked for hair. Null on slots created before this existed,
    // which stay open to any service.
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  }],
  blockedDates: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Calendar', calendarSchema);
