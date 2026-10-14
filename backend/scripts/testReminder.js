// Makes booking reminders testable without waiting around.
//
// A reminder goes out once an appointment is inside the next hour, and the
// scheduled job (.github/workflows/booking-reminders.yml) only runs every ten
// minutes — so testing it by hand means creating a booking at just the right
// time and then waiting. This does both parts at once: it puts a confirmed
// booking a given number of minutes from now and runs the reminder job
// immediately, then reports what was sent.
//
//   node scripts/testReminder.js someone@example.com
//   node scripts/testReminder.js someone@example.com 40        # minutes ahead
//   node scripts/testReminder.js someone@example.com 40 --keep # leave it behind
//
// The booking is removed afterwards unless --keep is given. The customer and
// every admin receive a real email, so use an address you can check.
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');
const Service = require('../src/models/Service');
const Admin = require('../src/models/Admin');
const Booking = require('../src/models/Booking');
const { sendReminders } = require('../src/controllers/reminderController');

const [email, minutesArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const keep = process.argv.includes('--keep');
const minutesAhead = Number(minutesArg || 40);

if (!email) {
  console.error('Usage: node scripts/testReminder.js <email> [minutesAhead] [--keep]');
  process.exit(1);
}
if (minutesAhead <= 0 || minutesAhead > 60) {
  console.error('minutesAhead must be between 1 and 60 — a reminder only goes out inside the final hour.');
  process.exit(1);
}

// SAST is UTC+2 all year, and a booking's time is stored as that wall clock.
const SAST_OFFSET_MIN = 120;

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
  if (!customer) {
    console.error(`No customer profile for ${email}. Create one on the sign-up page first.`);
    process.exit(1);
  }
  const service = await Service.findOne();
  const admin = await Admin.findOne();

  const at = new Date(Date.now() + minutesAhead * 60000);
  const sast = new Date(at.getTime() + SAST_OFFSET_MIN * 60000);
  const time = `${String(sast.getUTCHours()).padStart(2, '0')}:${String(sast.getUTCMinutes()).padStart(2, '0')}`;
  const date = new Date(sast.toISOString().slice(0, 10));

  const booking = await Booking.create({
    customerId: customer._id,
    serviceId: service._id,
    adminId: admin?._id || null,
    groupId: new mongoose.Types.ObjectId(),
    date,
    time,
    status: 'confirmed',
    reminderSent: false,
  });

  console.log(`Created a test booking for ${customer.name} <${customer.email}>`);
  console.log(`  ${service.name} at ${time} on ${date.toISOString().slice(0, 10)} (${minutesAhead} min from now)\n`);

  // Call the job the scheduled workflow calls, with the same shared secret.
  const result = await new Promise(resolve => {
    const req = { get: () => process.env.REMINDER_CRON_SECRET };
    const res = {
      status(code) { this.code = code; return this; },
      json(body) { resolve({ code: this.code || 200, body }); },
    };
    sendReminders(req, res);
  });

  console.log('Reminder job:', JSON.stringify(result.body));
  const after = await Booking.findById(booking._id);
  console.log(after?.reminderSent
    ? `\nReminder sent. Check ${customer.email} (and the admin inboxes).`
    : '\nNo reminder went out — the booking may be outside the one-hour window.');

  if (keep) {
    console.log(`\nLeft the booking in place (${booking._id}).`);
  } else {
    await Booking.findByIdAndDelete(booking._id);
    console.log('\nTest booking removed.');
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
