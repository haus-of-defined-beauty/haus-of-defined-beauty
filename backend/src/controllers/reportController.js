const Booking = require('../models/Booking');
const Customer = require('../models/Customer');

const newAndReturningCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().populate('bookingHistory');
    const returning = customers.filter(c => c.bookingHistory.length > 1);
    const newCustomers = customers.filter(c => c.bookingHistory.length === 1);
    res.json({ returning: returning.length, new: newCustomers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const topServices = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const monthlyBookingStatus = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const bookings = await Booking.find({ createdAt: { $gte: start, $lt: end } });
    const summary = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const peakBookingTimes = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: { time: '$time', day: { $dayOfWeek: '$date' } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { newAndReturningCustomers, topServices, monthlyBookingStatus, peakBookingTimes };
