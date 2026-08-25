const Calendar = require('../models/Calendar');
const { getOrCreateDay, toMin } = require('../utils/calendarSlots');

const getCalendar = async (req, res) => {
  try {
    const calendar = await Calendar.find();
    res.json(calendar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCalendarByDate = async (req, res) => {
  try {
    const day = await getOrCreateDay(req.params.date);
    await day.populate({ path: 'slots.bookingId', populate: { path: 'customerId serviceId' } });
    res.json(day);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addSlot = async (req, res) => {
  try {
    const { start, end } = req.body;
    if (!start || !end || start >= end) {
      return res.status(400).json({ message: 'Invalid start/end time' });
    }
    const day = await getOrCreateDay(req.params.date);

    const newStart = toMin(start);
    const newEnd = toMin(end);
    const overlaps = day.slots.some(s => newStart < toMin(s.end) && toMin(s.start) < newEnd);
    if (overlaps) {
      return res.status(409).json({ message: 'This time overlaps an existing slot — remove or adjust it first.' });
    }

    day.slots.push({ start, end, status: 'available' });
    await day.save();
    res.status(201).json(day);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeSlot = async (req, res) => {
  try {
    const day = await getOrCreateDay(req.params.date);

    const slot = day.slots.id(req.params.slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    if (slot.status === 'booked') {
      return res.status(409).json({ message: 'This slot is already booked and cannot be removed. Cancel or reschedule the booking first.' });
    }

    slot.deleteOne();
    await day.save();
    res.json(day);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCalendar, getCalendarByDate, addSlot, removeSlot };
