// Reports bookings that were made while signed in as an artist.
//
// An artist whose email is also a customer account was signed in as the
// admin, but the customer booking pages were still reachable — so their admin
// id was written into the booking as the customer. Those appointments belong
// to nobody the customer side can find: they don't appear under My Bookings
// for the real person, reports count an artist as a client, and paying for
// one fails with "Booking not found".
//
// The pages are now closed to admins, so no new ones can appear. This finds
// the ones already stored, and can cancel them — which frees the calendar
// slots they hold rather than deleting the record.
//
//   node scripts/adminMadeBookings.js            # report only
//   node scripts/adminMadeBookings.js --apply    # cancel them and free the slots
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const Booking = require('../src/models/Booking');
require('../src/models/Service');
const { releaseSlot } = require('../src/utils/calendarSlots');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const admins = await Admin.find().select('name email');
  const byId = Object.fromEntries(admins.map(a => [String(a._id), a.name]));

  const bookings = await Booking.find({ customerId: { $in: admins.map(a => a._id) } })
    .populate('serviceId')
    .sort('date time');

  if (!bookings.length) {
    console.log('No bookings were made from an artist account.');
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  let future = 0;
  for (const b of bookings) {
    const upcoming = new Date(b.date) >= new Date(now.toDateString());
    if (upcoming && b.status !== 'cancelled') future += 1;
    console.log(`  ${b.date.toISOString().slice(0, 10)} ${b.time}  ${(b.serviceId?.name || 'Unknown').padEnd(24)}`
      + ` ${b.status.padEnd(10)} booked as ${byId[String(b.customerId)]}${upcoming ? '  (upcoming)' : ''}`);
  }

  console.log(`\n${bookings.length} booking(s) made from an artist account, ${future} still upcoming`);

  if (apply) {
    let cancelled = 0;
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      await releaseSlot(b.date, b._id);
      b.status = 'cancelled';
      await b.save();
      cancelled += 1;
    }
    console.log(`${cancelled} cancelled, their calendar slots freed. The records are kept.`);
  } else {
    console.log('Dry run — re-run with --apply to cancel them and free their slots.');
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
