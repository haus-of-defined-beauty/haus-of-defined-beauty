const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const Payment = require('../models/Payment');
const notify = require('../utils/notify');
const { getOrCreateDay, findCoveredSlots, reserveSlot, releaseSlot, toMin } = require('../utils/calendarSlots');
const { appointmentInstant } = require('../utils/appointmentTime');
const { adminIdsForCategory } = require('../utils/serviceAdmins');
const { ownBookingsFilter } = require('../utils/ownBookings');

const CANCELLATION_WINDOW_HOURS = 24;

// A cancelled booking whose group fee was actually paid needs to show up on
// the admin's "awaiting refund" list — this only flags it (refundStatus:
// 'pending'); the admin marks it refunded once the money's actually back
// with the customer.
async function flagRefundIfPaid(groupId) {
  const payment = await Payment.findOne({ groupId, status: 'successful' }).sort({ createdAt: -1 });
  if (payment && payment.refundStatus === 'none') {
    payment.refundStatus = 'pending';
    await payment.save();
  }
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const createBooking = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'No services selected' });
    }

    const today = isoToday();
    const durations = {};
    const allowedAdmins = {};
    const spans = [];
    for (const item of items) {
      if (item.date <= today) {
        return res.status(400).json({ message: 'Bookings must be made at least a day in advance', item });
      }
      const service = await Service.findById(item.serviceId);
      if (!service) return res.status(400).json({ message: 'Invalid service', item });
      durations[item.serviceId] = service.duration;
      allowedAdmins[item.serviceId] = await adminIdsForCategory(service.category);

      // One customer can't be in two chairs at once, even where two artists
      // are both free — so the services in a booking can't overlap in time.
      const start = toMin(item.time);
      const end = start + service.duration;
      const clash = spans.find(s => s.date === item.date && start < s.end && s.start < end);
      if (clash) {
        return res.status(409).json({
          code: 'OVERLAPPING_SERVICES',
          message: `${service.name} overlaps ${clash.name} on ${item.date} — please pick a different time for one of them.`,
          item,
        });
      }
      spans.push({ date: item.date, start, end, name: service.name });

      const day = await getOrCreateDay(item.date);
      if (!findCoveredSlots(day, item.time, service.duration, allowedAdmins[item.serviceId])) {
        return res.status(409).json({ message: `Slot ${item.time} on ${item.date} is not available for this service's duration`, item });
      }
    }

    const groupId = new mongoose.Types.ObjectId();
    const created = [];
    try {
      for (const item of items) {
        const booking = await Booking.create({
          customerId: req.user.id,
          serviceId: item.serviceId,
          date: item.date,
          time: item.time,
          status: 'pending',
          groupId,
        });
        // The slot's owner becomes the booking's artist, so it lands on the
        // right dashboard rather than both.
        const adminId = await reserveSlot(
          item.date, item.time, booking._id,
          durations[item.serviceId], allowedAdmins[item.serviceId]
        );
        if (adminId) {
          booking.adminId = adminId;
          await booking.save();
        }
        created.push(booking);
      }
    } catch (err) {
      for (const b of created) {
        await releaseSlot(b.date, b._id).catch(() => {});
        await Booking.findByIdAndDelete(b._id).catch(() => {});
      }
      return res.status(409).json({ message: 'One of the selected slots was just booked by someone else — please try again.' });
    }

    res.status(201).json({ groupId, bookings: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user.id }).populate('serviceId');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];

const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const ALLOWED_FIELDS = ['notes', 'status'];
    const patch = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in req.body) patch[key] = req.body[key];
    }
    if (patch.status && !VALID_STATUSES.includes(patch.status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // If an admin moves a booking straight to cancelled from here (rather
    // than the dedicated cancel endpoint), the calendar slot still needs to
    // be freed, or it stays stuck "booked" forever with nothing pointing at it.
    if (patch.status === 'cancelled' && booking.status !== 'cancelled') {
      await releaseSlot(booking.date, booking._id);
      await flagRefundIfPaid(booking.groupId);
    }

    const updated = await Booking.findByIdAndUpdate(req.params.id, patch, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rescheduleBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to reschedule this booking' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking cannot be rescheduled' });
    }

    const hoursUntil = (new Date(booking.date) - new Date()) / 36e5;
    if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
      return res.status(400).json({ message: 'Cannot reschedule within 24 hours of appointment' });
    }

    const { date, time } = req.body;
    if (date <= isoToday()) {
      return res.status(400).json({ message: 'Bookings must be made at least a day in advance' });
    }
    const service = await Service.findById(booking.serviceId);
    // Rescheduling has to respect the same per-artist availability as booking,
    // or a hair appointment could be moved onto the nail artist's slot.
    const allowed = await adminIdsForCategory(service?.category);
    const day = await getOrCreateDay(date);
    if (!findCoveredSlots(day, time, service?.duration, allowed)) {
      return res.status(409).json({ message: 'No matching time slot available', code: 'SLOT_UNAVAILABLE' });
    }

    const oldDate = booking.date;
    const oldTime = booking.time;
    await releaseSlot(oldDate, booking._id);
    let newAdminId = null;
    try {
      newAdminId = await reserveSlot(date, time, booking._id, service?.duration, allowed);
    } catch (err) {
      await reserveSlot(oldDate, oldTime, booking._id, service?.duration, allowed).catch(() => {});
      return res.status(409).json({ message: 'Slot no longer available', code: 'SLOT_UNAVAILABLE' });
    }

    booking.date = date;
    booking.time = time;
    booking.wasRescheduled = true;
    booking.adminId = newAdminId || booking.adminId;
    await booking.save();

    const customer = await Customer.findById(booking.customerId);
    const admins = await Admin.find().select('email');
    const serviceName = service?.name || 'Service';
    const dateLabel = new Date(date).toLocaleDateString('en-ZA');
    // Awaited: a serverless function is frozen once it responds, so emails still
    // in flight at that point would never be sent. notify() never throws.
    await Promise.all([
      ...admins.map(a => notify(
        a.email,
        `${customer?.name || 'A customer'} rescheduled ${serviceName} to ${dateLabel} at ${time}.`,
        'Booking Rescheduled',
        'booking'
      )),
      notify(customer?.email, `Your ${serviceName} booking was rescheduled to ${dateLabel} at ${time}.`, 'Booking Rescheduled', 'booking'),
    ]);

    res.json(await booking.populate('serviceId'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancelling inside the window doesn't block the cancellation — it costs the
// booking fee. Refusing outright left customers stuck with an appointment
// they'd already decided not to attend, and the slot held for nobody.
function feeIsForfeited(booking) {
  const hoursUntil = (appointmentInstant(booking.date, booking.time) - new Date()) / 36e5;
  return hoursUntil < CANCELLATION_WINDOW_HOURS;
}

// Cancels a set of bookings as one action: frees their slots, settles the
// booking fee, and tells both sides what happened. `cancelledBy` decides
// whose cancellation it reads as.
async function settleCancellation(bookings, cancelledBy) {
  for (const b of bookings) {
    await releaseSlot(b.date, b._id);
    b.status = 'cancelled';
    await b.save();
  }

  // An admin cancelling is the salon's doing, so the customer never loses the
  // fee for it; a customer cancelling late does.
  const forfeited = cancelledBy === 'admin' ? false : feeIsForfeited(bookings[0]);
  if (!forfeited) await flagRefundIfPaid(bookings[0].groupId);

  const populated = await Booking.find({ _id: { $in: bookings.map(b => b._id) } })
    .populate('customerId serviceId');
  const customer = populated[0]?.customerId;
  const what = populated
    .map(b => `${b.serviceId?.name || 'Service'} on ${new Date(b.date).toLocaleDateString('en-ZA')} at ${b.time}`)
    .join('; ');

  const feeLine = forfeited
    ? 'As this was cancelled within 24 hours of the appointment, the R100 booking fee is forfeited.'
    : 'Your R100 booking fee will be refunded.';

  const customerMessage = cancelledBy === 'admin'
    ? `Hi ${(customer?.name || '').split(' ')[0] || 'there'},\n\nYour booking has been cancelled by the salon:\n\n${what}\n\n${feeLine}\n\nPlease get in touch if you'd like to rebook — we're sorry for the inconvenience.`
    : `Hi ${(customer?.name || '').split(' ')[0] || 'there'},\n\nYour booking has been cancelled as requested:\n\n${what}\n\n${feeLine}`;

  const admins = await Admin.find().select('email');
  // Awaited: a serverless function is frozen once it responds, so emails still
  // in flight at that point would never be sent. notify() never throws.
  await Promise.all([
    notify(customer?.email, customerMessage, 'Booking Cancelled', 'cancelled'),
    ...admins.map(a => notify(
      a.email,
      `${customer?.name || 'A customer'}'s booking was cancelled by ${cancelledBy === 'admin' ? 'the salon' : 'the customer'}: ${what}. ${feeLine}`,
      'Booking Cancelled',
      'cancelled'
    )),
  ]);

  return { forfeited };
}

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'admin' && booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(409).json({ message: 'This booking is already cancelled' });
    }

    const { forfeited } = await settleCancellation([booking], req.user.role === 'admin' ? 'admin' : 'customer');
    res.json({ message: 'Booking cancelled', feeForfeited: forfeited, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelBookingGroup = async (req, res) => {
  try {
    const filter = { groupId: req.params.groupId };
    if (req.user.role !== 'admin') filter.customerId = req.user.id;
    const bookings = await Booking.find(filter);
    if (!bookings.length) return res.status(404).json({ message: 'Booking not found' });

    const live = bookings.filter(b => b.status !== 'cancelled');
    if (!live.length) return res.status(409).json({ message: 'This booking is already cancelled' });

    const { forfeited } = await settleCancellation(live, req.user.role === 'admin' ? 'admin' : 'customer');
    res.json({ message: 'Booking cancelled', feeForfeited: forfeited, count: live.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find(await ownBookingsFilter(req.user.id)).populate('customerId serviceId');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  updateBooking,
  rescheduleBooking,
  cancelBooking,
  cancelBookingGroup,
  getAllBookings,
};
