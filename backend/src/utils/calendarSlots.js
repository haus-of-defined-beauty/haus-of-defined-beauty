const Calendar = require('../models/Calendar');

const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 60;
const CLOSED_WEEKDAYS = [0]; // Sunday

function pad(n) { return String(n).padStart(2, '0'); }
function toTime(mins) { return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; }
function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

function defaultSlotsFor(dateObj) {
  if (CLOSED_WEEKDAYS.includes(dateObj.getUTCDay())) return [];
  const slots = [];
  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MINUTES) {
    slots.push({ start: toTime(m), end: toTime(m + SLOT_MINUTES), status: 'available' });
  }
  return slots;
}

// Finds the Calendar day for a date, materializing it with the default
// business-hours template on first touch so nobody has to hand-build slots.
async function getOrCreateDay(dateStr) {
  const dateObj = new Date(dateStr);
  let day = await Calendar.findOne({ date: dateObj });
  if (day) return day;
  try {
    day = await Calendar.create({ date: dateObj, slots: defaultSlotsFor(dateObj) });
  } catch (err) {
    if (err.code === 11000) { // lost a race to create the same day — use theirs
      day = await Calendar.findOne({ date: dateObj });
    } else {
      throw err;
    }
  }
  return day;
}

// Returns the contiguous, available sub-documents (in start order) that fully
// cover [time, time + durationMinutes), or null if the slots don't exist,
// aren't all available, or leave a gap before the appointment would end.
function findCoveredSlots(day, time, durationMinutes) {
  const startMin = toMin(time);
  const endMin = startMin + (durationMinutes || 0);

  const covered = day.slots
    .filter(s => toMin(s.start) >= startMin && toMin(s.start) < endMin)
    .sort((a, b) => toMin(a.start) - toMin(b.start));

  if (!covered.length || covered[0].start !== time) return null;

  let cursor = startMin;
  for (const s of covered) {
    if (toMin(s.start) !== cursor || s.status !== 'available') return null;
    cursor = toMin(s.end);
  }
  if (cursor < endMin) return null; // available slots run out before the appointment would end

  return covered;
}

// Reserves every slot a service's duration spans starting at `time`, not just
// the one slot matching the start — otherwise a service longer than one slot
// would leave its later slots bookable by someone else at the same real time.
async function reserveSlot(date, time, bookingId, durationMinutes) {
  const day = await Calendar.findOne({ date: new Date(date) });
  if (!day) throw new Error('SLOT_UNAVAILABLE');
  const covered = findCoveredSlots(day, time, durationMinutes);
  if (!covered) throw new Error('SLOT_UNAVAILABLE');
  for (const s of covered) {
    s.status = 'booked';
    s.bookingId = bookingId;
  }
  await day.save();
}

// Frees every slot on this date that this booking holds, regardless of how
// many slots its duration spanned.
async function releaseSlot(date, bookingId) {
  const day = await Calendar.findOne({ date: new Date(date) });
  if (!day) return;
  let changed = false;
  for (const s of day.slots) {
    if (s.bookingId && s.bookingId.toString() === String(bookingId)) {
      s.status = 'available';
      s.bookingId = null;
      changed = true;
    }
  }
  if (changed) await day.save();
}

module.exports = { getOrCreateDay, findCoveredSlots, reserveSlot, releaseSlot, toMin };
