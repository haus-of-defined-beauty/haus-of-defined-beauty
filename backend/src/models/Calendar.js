const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  availableSlots: [{ type: String }], // e.g. ["09:00", "10:00", "11:00"]
  blockedSlots: [{ type: String }],
  blockedDates: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Calendar', calendarSchema);
