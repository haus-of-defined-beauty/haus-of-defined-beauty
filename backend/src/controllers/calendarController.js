const Calendar = require('../models/Calendar');
const Service = require('../models/Service');
const { getOrCreateDay, toMin, OPEN_HOUR, CLOSE_HOUR } = require('../utils/calendarSlots');
const { appointmentInstant } = require('../utils/appointmentTime');
const { adminIdsForCategory } = require('../utils/serviceAdmins');

const getCalendar = async (req, res) => {
  try {
    const calendar = await Calendar.find();
    res.json(calendar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/calendar/:date
//   ?serviceId=…  — only the availability a customer could actually book for
//                   that service (its category's artists), used by booking.
//   ?mine=1       — only this admin's own slots, used by the admin calendar.
// Without either, the whole day comes back as before.
const getCalendarByDate = async (req, res) => {
  try {
    const day = await getOrCreateDay(req.params.date);
    await day.populate({ path: 'slots.bookingId', populate: { path: 'customerId serviceId' } });

    let slots = day.slots;

    if (req.query.serviceId) {
      const service = await Service.findById(req.query.serviceId);
      const allowed = (await adminIdsForCategory(service?.category)).map(String);
      // Slots with no owner predate per-admin availability, so they stay
      // bookable for anything rather than vanishing from existing days.
      slots = slots.filter(s => !s.adminId || allowed.includes(String(s.adminId)));

      // Both artists can be open at the same hour. The customer only needs to
      // know the salon is free then, so show one entry per time — and prefer
      // a free one, since the hour is still bookable if either is free.
      const byTime = new Map();
      for (const s of slots) {
        const seen = byTime.get(s.start);
        if (!seen || (seen.status !== 'available' && s.status === 'available')) byTime.set(s.start, s);
      }
      slots = [...byTime.values()];

      // Bookings need a day's notice, so today and anything already past is
      // never offered — showing them only invites an error at the last step.
      const earliest = new Date();
      earliest.setHours(0, 0, 0, 0);
      earliest.setDate(earliest.getDate() + 1);
      if (new Date(req.params.date) < earliest) slots = [];

      slots = slots
        .filter(s => s.status === 'available')
        .sort((a, b) => toMin(a.start) - toMin(b.start));
    }

    if (req.query.mine === '1' && req.user?.role === 'admin') {
      slots = slots.filter(s => !s.adminId || String(s.adminId) === String(req.user.id));
    }

    res.json({ ...day.toObject(), slots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// A slot in the past can't be worked, and one outside opening hours isn't
// real availability — both used to be accepted and then sat in the calendar
// as bookable time.
function slotProblem(dateStr, start, end) {
  if (!start || !end || start >= end) return 'Enter a start time earlier than the end time.';

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (startMin < OPEN_HOUR * 60 || endMin > CLOSE_HOUR * 60) {
    return `Time slots must fall inside business hours (${String(OPEN_HOUR).padStart(2, '0')}:00–${CLOSE_HOUR}:00).`;
  }

  if (appointmentInstant(dateStr, start) <= new Date()) {
    return 'That time has already passed — pick a later one.';
  }

  return null;
}

const addSlot = async (req, res) => {
  try {
    const { start, end } = req.body;
    const problem = slotProblem(req.params.date, start, end);
    if (problem) return res.status(400).json({ message: problem, code: 'INVALID_SLOT' });

    const day = await getOrCreateDay(req.params.date);

    const newStart = toMin(start);
    const newEnd = toMin(end);
    // Only this admin's own slots can clash — the two artists work in
    // parallel, so the same hour can be open for both.
    const mine = day.slots.filter(s => !s.adminId || String(s.adminId) === String(req.user.id));
    const overlaps = mine.some(s => newStart < toMin(s.end) && toMin(s.start) < newEnd);
    if (overlaps) {
      return res.status(409).json({ message: 'This time overlaps one of your existing slots — remove or adjust it first.' });
    }

    day.slots.push({ start, end, status: 'available', adminId: req.user.id });
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

    if (slot.adminId && String(slot.adminId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'That slot belongs to another artist.' });
    }

    if (slot.status === 'booked') {
      return res.status(409).json({ message: 'This slot is already booked and cannot be removed. Cancel or reschedule the booking first.' });
    }

    // Past availability is a record of what was open, not something to edit.
    if (appointmentInstant(req.params.date, slot.start) <= new Date()) {
      return res.status(400).json({ message: 'That time has already passed and can no longer be changed.' });
    }

    slot.deleteOne();
    await day.save();
    res.json(day);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCalendar, getCalendarByDate, addSlot, removeSlot };
