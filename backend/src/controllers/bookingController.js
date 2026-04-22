const Booking = require('../models/Booking');
const Calendar = require('../models/Calendar');

const CANCELLATION_WINDOW_HOURS = 24;

const createBooking = async (req, res) => {
  try {
    const { serviceId, date, time } = req.body;

    const calendarDay = await Calendar.findOne({ date: new Date(date) });
    if (!calendarDay || !calendarDay.availableSlots.includes(time)) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    const existing = await Booking.findOne({ date, time, status: { $in: ['pending', 'confirmed'] } });
    if (existing) return res.status(409).json({ message: 'Time slot already booked' });

    const booking = await Booking.create({
      customerId: req.user.id,
      serviceId,
      date,
      time,
      status: 'pending',
    });

    res.status(201).json(booking);
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

const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const hoursUntil = (new Date(booking.date) - new Date()) / 36e5;
    if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
      return res.status(400).json({ message: 'Cannot reschedule within 24 hours of appointment' });
    }

    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const hoursUntil = (new Date(booking.date) - new Date()) / 36e5;
    if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
      return res.status(400).json({ message: 'Cannot cancel within 24 hours — booking fee forfeited' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json({ message: 'Booking cancelled', booking });
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

module.exports = { createBooking, getMyBookings, updateBooking, cancelBooking, getAllBookings };
