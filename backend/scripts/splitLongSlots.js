// Splits availability blocks longer than an hour into hourly units.
//
// A slot is offered to customers from its start, and from nowhere else — so a
// single 08:30–11:30 block was one bookable appointment and the other two
// hours could not be reached. Slots added from the admin calendar are now
// split as they're created; this does the same for the ones already stored.
//
// Only free, future slots are touched. A booked slot is left exactly as it is
// so the booking it belongs to keeps pointing at something real.
//
//   node scripts/splitLongSlots.js            # report only
//   node scripts/splitLongSlots.js --apply    # write the changes
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Calendar = require('../src/models/Calendar');
const Admin = require('../src/models/Admin');
const { splitRange, toMin } = require('../src/utils/calendarSlots');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const names = Object.fromEntries(
    (await Admin.find().select('name')).map(a => [String(a._id), a.name])
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = await Calendar.find({ date: { $gte: today } }).sort('date');

  let daysTouched = 0;
  let longSlots = 0;
  let unitsCreated = 0;

  for (const day of days) {
    const long = day.slots.filter(s =>
      s.status === 'available' && toMin(s.end) - toMin(s.start) > 60);
    if (!long.length) continue;

    daysTouched += 1;
    for (const slot of long) {
      const units = splitRange(slot.start, slot.end);
      longSlots += 1;
      unitsCreated += units.length;
      console.log(`  ${day.date.toISOString().slice(0, 10)}  ${names[String(slot.adminId)] || 'unowned'}`
        + `  ${slot.start}-${slot.end}  ->  ${units.map(u => `${u.start}-${u.end}`).join(' ')}`);

      if (apply) {
        for (const unit of units) {
          day.slots.push({ ...unit, status: 'available', adminId: slot.adminId });
        }
        slot.deleteOne();
      }
    }
    if (apply) await day.save();
  }

  console.log(`\n${longSlots} block(s) over an hour across ${daysTouched} day(s)`);
  console.log(`${unitsCreated} hourly unit(s) ${apply ? 'created' : 'would be created'}`);
  if (!apply && longSlots) console.log('\nDry run — re-run with --apply to make the change.');

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
