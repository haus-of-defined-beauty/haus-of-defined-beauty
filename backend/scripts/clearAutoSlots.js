// Removes the auto-generated availability left behind by the old calendar.
//
// Days used to be materialised with an hourly 08:00–17:00 template the moment
// anyone looked at them, so the salon appeared open every hour of every day,
// and those slots belonged to no particular artist. That makes per-artist
// availability impossible: a nail artist's hours and a hair artist's hours
// are indistinguishable from slots nobody opened.
//
// Only slots that are all of: unowned, still free, and in the future are
// removed. Booked slots stay (an appointment is attached to them) and past
// days stay as a record of what was open.
//
//   node scripts/clearAutoSlots.js            # report only, changes nothing
//   node scripts/clearAutoSlots.js --apply    # actually remove them
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Calendar = require('../src/models/Calendar');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const days = await Calendar.find({ date: { $gte: today } });
  let slotsRemoved = 0;
  let daysTouched = 0;
  let kept = 0;

  for (const day of days) {
    const before = day.slots.length;
    const survivors = day.slots.filter(s => s.adminId || s.status !== 'available');
    kept += survivors.length;
    if (survivors.length === before) continue;

    slotsRemoved += before - survivors.length;
    daysTouched += 1;
    if (apply) {
      day.slots = survivors;
      await day.save();
    }
  }

  console.log(`${days.length} future day(s) examined`);
  console.log(`${slotsRemoved} unowned free slot(s) across ${daysTouched} day(s) ${apply ? 'removed' : 'would be removed'}`);
  console.log(`${kept} slot(s) kept (booked, or opened by an artist)`);
  if (!apply) console.log('\nDry run — re-run with --apply to make the change.');

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
