// Lays the opening-hours template into existing days that have none.
//
// A day only gets the template when it is first created. Days that already
// existed — including every day emptied by scripts/clearAutoSlots.js — are
// therefore left with no availability at all and no way to get any except by
// an artist adding every hour by hand. That is what happened after the
// clear-out: 157 of 164 upcoming days were sitting empty, so customers had
// nothing to book.
//
// For each future day that exists, this adds the template for any admin who
// currently has no slots on it. An admin who has opened even one slot that
// day is left alone, so a deliberately light day isn't re-filled behind
// their back. Sundays stay closed, and nothing already booked is touched.
//
//   node scripts/seedCalendarTemplate.js            # report only
//   node scripts/seedCalendarTemplate.js --apply    # write the changes
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Calendar = require('../src/models/Calendar');
const Admin = require('../src/models/Admin');

const apply = process.argv.includes('--apply');

const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 60;
const CLOSED_WEEKDAYS = [0]; // Sunday

const pad = n => String(n).padStart(2, '0');
const toTime = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const admins = await Admin.find().select('_id name');
  if (!admins.length) {
    console.error('No admins — nothing to open availability for.');
    process.exit(1);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = await Calendar.find({ date: { $gte: today } }).sort('date');

  let daysTouched = 0;
  let slotsAdded = 0;
  let skippedSunday = 0;
  let skippedHasSlots = 0;

  for (const day of days) {
    if (CLOSED_WEEKDAYS.includes(day.date.getUTCDay())) { skippedSunday += 1; continue; }

    let changed = false;
    for (const admin of admins) {
      const has = day.slots.some(s => String(s.adminId) === String(admin._id));
      if (has) { skippedHasSlots += 1; continue; }

      for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MINUTES) {
        day.slots.push({ start: toTime(m), end: toTime(m + SLOT_MINUTES), status: 'available', adminId: admin._id });
        slotsAdded += 1;
        changed = true;
      }
    }

    if (changed) {
      daysTouched += 1;
      if (apply) await day.save();
    }
  }

  console.log(`${days.length} existing future day(s) examined`);
  console.log(`${slotsAdded} slot(s) across ${daysTouched} day(s) ${apply ? 'added' : 'would be added'}`);
  console.log(`${skippedSunday} Sunday(s) left closed`);
  console.log(`${skippedHasSlots} artist-day(s) left alone (that artist already has slots there)`);
  if (!apply && slotsAdded) console.log('\nDry run — re-run with --apply to make the change.');

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
