const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const notify = require('../utils/notify');
const { getOrCreateDay, findCoveredSlots, reserveSlot, releaseSlot } = require('../utils/calendarSlots');

const CANCELLATION_WINDOW_HOURS = 24;

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
    for (const item of items) {
      if (item.date <= today) {
        return res.status(400).json({ message: 'Bookings must be made at least a day in advance', item });
      }
      const service = await Service.findById(item.serviceId);
      if (!service) return res.status(400).json({ message: 'Invalid service', item });
      durations[item.serviceId] = service.duration;

      const day = await getOrCreateDay(item.date);
      if (!findCoveredSlots(day, item.time, service.duration)) {
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
        await reserveSlot(item.date, item.time, booking._id, durations[item.serviceId]);
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
    const day = await getOrCreateDay(date);
    if (!findCoveredSlots(day, time, service?.duration)) {
      return res.status(409).json({ message: 'No matching time slot available', code: 'SLOT_UNAVAILABLE' });
    }

    const oldDate = booking.date;
    const oldTime = booking.time;
    await releaseSlot(oldDate, booking._id);
    try {
      await reserveSlot(date, time, booking._id, service?.duration);
    } catch (err) {
      await reserveSlot(oldDate, oldTime, booking._id, service?.duration).catch(() => {});
      return res.status(409).json({ message: 'Slot no longer available', code: 'SLOT_UNAVAILABLE' });
    }

    booking.date = date;
    booking.time = time;
    booking.wasRescheduled = true;
    await booking.save();

    const customer = await Customer.findById(booking.customerId);
    const admins = await Admin.find().select('email');
    const serviceName = service?.name || 'Service';
    const dateLabel = new Date(date).toLocaleDateString('en-ZA');
    admins.forEach(a => notify(
      a.email,
      `${customer?.name || 'A customer'} rescheduled ${serviceName} to ${dateLabel} at ${time}.`
    ));
    notify(customer?.email, `Your ${serviceName} booking was rescheduled to ${dateLabel} at ${time}.`);

    res.json(await booking.populate('serviceId'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Admins can cancel same-day (e.g. a customer calls in, walks out, the
    // salon needs to close) — the 24h window only protects against a
    // customer cancelling last-minute without the fee being forfeited.
    if (req.user.role !== 'admin') {
      const hoursUntil = (new Date(booking.date) - new Date()) / 36e5;
      if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
        return res.status(400).json({ message: 'Cannot cancel within 24 hours — booking fee forfeited' });
      }
    }

    booking.status = 'cancelled';
    await releaseSlot(booking.date, booking._id);
    await booking.save();
    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelBookingGroup = async (req, res) => {
  try {
    const bookings = await Booking.find({ groupId: req.params.groupId, customerId: req.user.id });
    if (!bookings.length) return res.status(404).json({ message: 'Booking not found' });

    for (const b of bookings) {
      await releaseSlot(b.date, b._id);
      b.status = 'cancelled';
      await b.save();
    }
    res.json({ message: 'Booking cancelled', count: bookings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('customerId serviceId');
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
