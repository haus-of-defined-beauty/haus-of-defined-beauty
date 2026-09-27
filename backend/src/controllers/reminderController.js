const Booking = require('../models/Booking');
const Admin = require('../models/Admin');
const notify = require('../utils/notify');
const { appointmentInstant } = require('../utils/appointmentTime');

const REMINDER_WINDOW_MIN = 60; // send once an appointment is within this many minutes

// POST /api/reminders/send — meant to be hit on a schedule (see
// .github/workflows/booking-reminders.yml), not by a signed-in user, so it's
// guarded by a shared secret instead of a login. Idempotent: each booking is
// only ever reminded once (reminderSent), so calling it repeatedly — which a
// polling schedule necessarily does — never double-sends.
const sendReminders = async (req, res) => {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret || req.get('x-cron-secret') !== secret) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const now = new Date();
    // A generous ±1 day window around "now" — cheap to fetch, and business
    // hours (08:00–17:00 SAST) never actually push an appointment's real
    // instant outside its own stored calendar date, so this can't miss one.
    const rangeStart = new Date(now);
    rangeStart.setUTCHours(0, 0, 0, 0);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
    const rangeEnd = new Date(now);
    rangeEnd.setUTCHours(0, 0, 0, 0);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

    const candidates = await Booking.find({
      status: 'confirmed',
      reminderSent: false,
      date: { $gte: rangeStart, $lt: rangeEnd },
    }).populate('customerId serviceId');

    const admins = await Admin.find().select('email');
    let remindersSent = 0;

    for (const booking of candidates) {
      const startsAt = appointmentInstant(booking.date, booking.time);
      const minutesUntil = (startsAt - now) / 60000;
      if (minutesUntil <= 0 || minutesUntil > REMINDER_WINDOW_MIN) continue;

      const serviceName = booking.serviceId?.name || 'appointment';
      const customerName = booking.customerId?.name || 'A customer';
      const dateLabel = new Date(booking.date).toLocaleDateString('en-ZA');

      await Promise.all([
        notify(
          booking.customerId?.email,
          `Reminder: your ${serviceName} appointment is coming up at ${booking.time} today (${dateLabel}). See you soon!`
        ),
        ...admins.map(a => notify(
          a.email,
          `Reminder: ${customerName} has a ${serviceName} appointment at ${booking.time} today (${dateLabel}).`
        )),
      ]);

      booking.reminderSent = true;
      await booking.save();
      remindersSent += 1;
    }

    res.json({ checked: candidates.length, remindersSent });
  } catch (err) {
    console.error('[REMINDERS] failed:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendReminders };
