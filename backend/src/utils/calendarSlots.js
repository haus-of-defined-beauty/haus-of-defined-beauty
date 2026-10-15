const Calendar = require('../models/Calendar');
const Admin = require('../models/Admin');

const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 60;
const CLOSED_WEEKDAYS = [0]; // Sunday

function pad(n) { return String(n).padStart(2, '0'); }
function toTime(mins) { return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; }
function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

// The opening-hours template a day starts with, laid out once per artist so
// every slot has an owner. Without an owner a slot is availability for
// nobody in particular, which is what previously let the nail artist's hours
// be booked for hair.
function defaultSlotsFor(dateObj, adminIds) {
  if (CLOSED_WEEKDAYS.includes(dateObj.getUTCDay())) return [];
  const slots = [];
  for (const adminId of adminIds) {
    for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MINUTES) {
      slots.push({ start: toTime(m), end: toTime(m + SLOT_MINUTES), status: 'available', adminId });
    }
  }
  return slots;
}

// Splits an open range into bookable units on the same hourly rhythm as the
// opening-hours template, with any remainder as a shorter final unit.
//
// An artist's availability is offered to customers from the start of each
// unit, so a single three-hour block was one bookable appointment and the
// rest of the morning couldn't be reached at all. Three one-hour units give
// three start times for the same open hours.
function splitRange(start, end) {
  const units = [];
  for (let m = toMin(start); m < toMin(end); m += SLOT_MINUTES) {
    units.push({ start: toTime(m), end: toTime(Math.min(m + SLOT_MINUTES, toMin(end))) });
  }
  return units;
}

// Finds the Calendar day for a date, laying out the opening-hours template
// for each artist the first time anyone touches it — so the salon has
// availability without anyone having to build a calendar by hand.
//
// Only the *first* touch does this. Once the day exists, it's whatever the
// artists have made it: slots they removed stay removed, and a day they've
// emptied stays empty.
async function getOrCreateDay(dateStr) {
  const dateObj = new Date(dateStr);
  let day = await Calendar.findOne({ date: dateObj });
  if (day) return day;

  const admins = await Admin.find().select('_id');
  try {
    day = await Calendar.create({
      date: dateObj,
      slots: defaultSlotsFor(dateObj, admins.map(a => a._id)),
    });
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
  splitRange,
  findCoveredSlots,
  reserveSlot,
  releaseSlot,
  toMin,
  OPEN_HOUR,
  CLOSE_HOUR,
};
