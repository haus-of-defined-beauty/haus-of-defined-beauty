const Calendar = require('../models/Calendar');

const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 60;
const CLOSED_WEEKDAYS = [0]; // Sunday

function pad(n) { return String(n).padStart(2, '0'); }
function toTime(mins) { return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; }
function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

// Finds the Calendar day for a date, creating it empty on first touch.
//
// Days used to be pre-filled with an hourly 08:00–17:00 template, which meant
// the salon appeared available at every hour of every day whether or not
// anyone was working, and left those slots belonging to no particular admin —
// so one artist's "availability" could be booked for the other's services.
// Availability is now only what an admin actually opens.
async function getOrCreateDay(dateStr) {
  const dateObj = new Date(dateStr);
  let day = await Calendar.findOne({ date: dateObj });
  if (day) return day;
  try {
    day = await Calendar.create({ date: dateObj, slots: [] });
  } catch (err) {
    if (err.code === 11000) { // lost a race to create the same day — use theirs
      day = await Calendar.findOne({ date: dateObj });
    } else {
      throw err;
    }
  }
  return day;
}

const ownerOf = slot => (slot.adminId ? String(slot.adminId) : null);

// Returns the contiguous, available sub-documents (in start order) that fully
// cover [time, time + durationMinutes), or null if the slots don't exist,
// aren't all available, or leave a gap before the appointment would end.
//
// `allowedAdminIds` (optional) restricts this to availability opened by
// admins who actually do this service — a nail artist's slot is not hair
// availability. Slots with no owner predate per-admin availability and stay
// open to anything. An appointment also can't be stitched together from two
// different artists' slots, so every covered slot must share one owner.
function findCoveredSlots(day, time, durationMinutes, allowedAdminIds) {
  const startMin = toMin(time);
  const endMin = startMin + (durationMinutes || 0);
  const allowed = allowedAdminIds ? allowedAdminIds.map(String) : null;

  // Both artists can be open at the same hour, so their slots have to be
  // considered as separate timelines. Walking them as one interleaved list
  // reads the second artist's 09:00 as a gap after the first's 09:00–10:00
  // and rejects a booking that is perfectly available.
  const byOwner = new Map();
  for (const s of day.slots) {
    if (toMin(s.start) < startMin || toMin(s.start) >= endMin) continue;
    const owner = ownerOf(s);
    if (allowed && owner !== null && !allowed.includes(owner)) continue;
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner).push(s);
  }

  for (const slots of byOwner.values()) {
    slots.sort((a, b) => toMin(a.start) - toMin(b.start));
    if (slots[0].start !== time) continue;

    let cursor = startMin;
    let covers = true;
    for (const s of slots) {
      if (toMin(s.start) !== cursor || s.status !== 'available') { covers = false; break; }
      cursor = toMin(s.end);
    }
    // available slots must run all the way to the end of the appointment
    if (covers && cursor >= endMin) return slots;
  }

  return null;
}

// Reserves every slot a service's duration spans starting at `time`, not just
// the one slot matching the start — otherwise a service longer than one slot
// would leave its later slots bookable by someone else at the same real time.
// Returns the id of the admin whose availability was taken (null for legacy
// unowned slots), so the booking can be filed against the right artist.
async function reserveSlot(date, time, bookingId, durationMinutes, allowedAdminIds) {
  const day = await Calendar.findOne({ date: new Date(date) });
  if (!day) throw new Error('SLOT_UNAVAILABLE');
  const covered = findCoveredSlots(day, time, durationMinutes, allowedAdminIds);
  if (!covered) throw new Error('SLOT_UNAVAILABLE');
  for (const s of covered) {
    s.status = 'booked';
    s.bookingId = bookingId;
  }
  await day.save();
  return covered[0].adminId || null;
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

module.exports = {
  getOrCreateDay,
  findCoveredSlots,
  reserveSlot,
  releaseSlot,
  toMin,
  OPEN_HOUR,
  CLOSE_HOUR,
};
