// Files existing bookings against the artist who does that service.
//
// Bookings made before per-artist allocation have no adminId, so they show on
// every admin's dashboard — which is why both profiles still list work for
// services they don't do. This assigns each one to the admin whose
// specialties cover its service category.
//
// A booking is only assigned when exactly one admin covers that category. If
// several do (the default, where every admin does everything), there is no
// right answer, so it's left alone and reported — set the specialties on each
// admin's My Profile page first, then run this again.
//
//   node scripts/assignBookingAdmins.js            # report only
//   node scripts/assignBookingAdmins.js --apply    # write the changes
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const Booking = require('../src/models/Booking');
require('../src/models/Service'); // registered so .populate('serviceId') can resolve

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const admins = await Admin.find().select('name specialties');
  const byCategory = {};
  for (const a of admins) {
    for (const c of a.specialties || []) (byCategory[c] = byCategory[c] || []).push(a);
  }

  console.log('Who covers what:');
  for (const [cat, list] of Object.entries(byCategory)) {
    console.log(`  ${cat.padEnd(7)} ${list.map(a => a.name).join(', ')}`);
  }
  console.log();

  const unassigned = await Booking.find({
    $or: [{ adminId: null }, { adminId: { $exists: false } }],
  }).populate('serviceId');

  let assigned = 0;
  const ambiguous = {};

  for (const b of unassigned) {
    const category = b.serviceId?.category;
    const candidates = byCategory[category] || [];
    if (candidates.length !== 1) {
      ambiguous[category || 'unknown'] = (ambiguous[category || 'unknown'] || 0) + 1;
      continue;
    }
    assigned += 1;
    if (apply) {
      b.adminId = candidates[0]._id;
      await b.save();
    }
  }

  console.log(`${unassigned.length} booking(s) with no artist`);
  console.log(`${assigned} ${apply ? 'assigned' : 'could be assigned'}`);
  for (const [cat, n] of Object.entries(ambiguous)) {
    const who = (byCategory[cat] || []).length;
    console.log(`  ${n} left alone (${cat}: ${who === 0 ? 'no admin covers it' : who + ' admins cover it'})`);
  }
  if (!apply && assigned) console.log('\nDry run — re-run with --apply to make the change.');

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
