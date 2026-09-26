// Removes every booking created by scripts/seedTestBookings.js (tagged
// notes: 'seed-test-data'). Does not touch the synthetic @example.com
// customer records themselves, only the bookings.
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']); // see app.js — this environment's resolver refuses SRV queries
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const { deletedCount } = await Booking.deleteMany({ notes: 'seed-test-data' });
  console.log(`Removed ${deletedCount} test bookings.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
