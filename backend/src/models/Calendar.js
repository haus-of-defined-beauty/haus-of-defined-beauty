const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  slots: [{
    start: { type: String, required: true }, // "HH:MM"
    end: { type: String, required: true },   // "HH:MM"
    status: { type: String, enum: ['available', 'booked', 'blocked'], default: 'available' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  }],
  blockedDates: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Calendar', calendarSchema);
