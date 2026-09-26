// Floods the database with realistic test bookings across last month so the
// Reports tab (Monthly Booking Status, Peak Booking Times, Top Services,
// Returning & New Customers) has enough volume to actually show shape.
// Every synthetic customer uses an @example.com email and every booking is
// tagged notes: 'seed-test-data' so this batch can be found/removed later —
// see scripts/removeTestBookings.js.
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']); // see app.js — this environment's resolver refuses SRV queries
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Customer = require('../src/models/Customer');
const Service = require('../src/models/Service');

const SEED_TAG = 'seed-test-data';
const TARGET_SLOTS = 140; // a "slot" is 1 booking, or 2 sharing a cart (groupId)
const TIME_POOL = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const CUSTOMERS = [
  { name: 'Pamela Wright', email: 'pamela.wright@example.com', phone: '061 557 7932' },
  { name: 'Sarah Dew', email: 'sarah.dew@example.com', phone: '071 743 6772' },
  { name: 'Lerato Khan', email: 'lerato.khan@example.com', phone: '021 887 6767' },
  { name: 'Tshenolo Du Toit', email: 'tshenolo.dutoit@example.com', phone: '083 876 6666' },
  { name: 'Lisbon Jane', email: 'lisbon.jane@example.com', phone: '071 743 6709' },
  { name: 'Naledi Mokoena', email: 'naledi.mokoena@example.com', phone: '082 345 1290' },
  { name: 'Zanele Dlamini', email: 'zanele.dlamini@example.com', phone: '073 221 5567' },
  { name: 'Amelia Carter', email: 'amelia.carter@example.com', phone: '060 112 8834' },
  { name: 'Refilwe Ndlovu', email: 'refilwe.ndlovu@example.com', phone: '084 556 9021' },
  { name: 'Chloe Williams', email: 'chloe.williams@example.com', phone: '076 334 7712' },
  { name: 'Buhle Mthembu', email: 'buhle.mthembu@example.com', phone: '079 902 4456' },
  { name: 'Thembi Naidoo', email: 'thembi.naidoo@example.com', phone: '072 118 9034' },
];
// These four get exactly one (confirmed) booking each, so they land as
// "New" in the Returning & New Customers report rather than "Returning".
const NEW_ONLY = [
  { name: 'Grace Lee', email: 'grace.lee@example.com', phone: '065 774 2201' },
  { name: 'Zoe Thompson', email: 'zoe.thompson@example.com', phone: '081 663 5590' },
  { name: 'Olivia Martinez', email: 'olivia.martinez@example.com', phone: '063 220 4471' },
  { name: 'Sofia Nguyen', email: 'sofia.nguyen@example.com', phone: '074 889 3312' },
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function weightedCategory() {
  const r = Math.random();
  if (r < 0.40) return 'nails';
  if (r < 0.72) return 'hair';
  if (r < 0.88) return 'makeup';
  return 'lashes';
}

function weightedStatus() {
  const r = Math.random();
  if (r < 0.82) return { status: pick(['confirmed', 'completed']), wasRescheduled: false };
  if (r < 0.88) return { status: pick(['confirmed', 'completed']), wasRescheduled: true };
  if (r < 0.96) return { status: 'cancelled', wasRescheduled: false };
  return { status: 'no-show', wasRescheduled: false };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Always seeds *last calendar month* (relative to whenever this script is
// run) — matching what the Monthly Booking Status report actually queries
// — rather than a hardcoded month that goes stale as time passes.
function lastMonthBusinessDays() {
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonthStart.getFullYear();
  const month = lastMonthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCDay() !== 0) days.push(d); // salon is closed Sundays
  }
  return { days, label: `${MONTH_NAMES[month]} ${year}` };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const servicesByCategory = {};
  for (const cat of ['nails', 'hair', 'makeup', 'lashes']) {
    servicesByCategory[cat] = await Service.find({ category: cat });
  }
  if (Object.values(servicesByCategory).some(list => !list.length)) {
    console.error('Missing services for one or more categories — run scripts/seedServices.js first.');
    process.exit(1);
  }

  const upsertCustomer = async ({ name, email, phone }) =>
    Customer.findOneAndUpdate({ email }, { $setOnInsert: { name, email, phone } }, { upsert: true, new: true });

  const returningCustomers = await Promise.all(CUSTOMERS.map(upsertCustomer));
  const newCustomers = await Promise.all(NEW_ONLY.map(upsertCustomer));

  // Re-running this script re-seeds fresh for whatever "last month" is now,
  // rather than piling up alongside a previous, now-stale month's batch.
  const { deletedCount } = await Booking.deleteMany({ notes: SEED_TAG });
  if (deletedCount) console.log(`Cleared ${deletedCount} previously seeded test bookings.`);

  const { days, label } = lastMonthBusinessDays();
  const docs = [];

  // Guarantee the "new" customers each get exactly one confirmed booking.
  for (const customer of newCustomers) {
    const category = weightedCategory();
    const service = pick(servicesByCategory[category]);
    docs.push({
      customerId: customer._id,
      serviceId: service._id,
      groupId: new mongoose.Types.ObjectId(),
      date: pick(days),
      time: pick(TIME_POOL),
      status: 'confirmed',
      wasRescheduled: false,
      notes: SEED_TAG,
    });
  }

  let slots = TARGET_SLOTS - newCustomers.length;
  while (slots > 0) {
    const customer = pick(returningCustomers);
    const date = pick(days);
    const asPair = Math.random() < 0.15 && slots >= 2;
    const groupId = new mongoose.Types.ObjectId();
    const count = asPair ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const category = weightedCategory();
      const service = pick(servicesByCategory[category]);
      const { status, wasRescheduled } = weightedStatus();
      docs.push({
        customerId: customer._id,
        serviceId: service._id,
        groupId,
        date,
        time: pick(TIME_POOL),
        status,
        wasRescheduled,
        notes: SEED_TAG,
      });
    }
    slots -= count;
  }

  await Booking.insertMany(docs);
  console.log(`Seeded ${docs.length} test bookings across ${returningCustomers.length + newCustomers.length} customers for ${label}.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
