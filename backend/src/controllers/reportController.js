const Booking = require('../models/Booking');
const renderReportPdf = require('../utils/pdfReport');

const CATEGORY_GROUPS = { hair: 'Hair', nails: 'Nails', makeup: 'Makeup & Lashes', lashes: 'Makeup & Lashes' };

// Counted from actual Booking records rather than Customer.bookingHistory —
// nothing in the app ever writes to that array, so reading it always
// returned zero for every customer regardless of real activity.
async function getNewAndReturningCustomers() {
  const counts = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: '$customerId', count: { $sum: 1 } } },
  ]);
  return {
    returning: counts.filter(c => c.count > 1).length,
    new: counts.filter(c => c.count === 1).length,
  };
}

const newAndReturningCustomers = async (req, res) => {
  try {
    const data = await getNewAndReturningCustomers();
    if (req.query.format === 'pdf') {
      return renderReportPdf(res, 'new-vs-returning-customers.pdf', 'New vs Returning Customers', [
        { label: 'Returning Customers', value: data.returning },
        { label: 'New Customers', value: data.new },
      ]);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Was filtering on status: 'completed' only — nothing in the app ever marks
// a booking completed, so this always returned an empty list. Confirmed
// (paid) bookings are what actually reflect real, booked demand. Also now
// resolves service names instead of returning bare ObjectIds.
async function getTopServices() {
  return Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: '$serviceId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
    { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, serviceId: '$_id', name: { $ifNull: ['$service.name', 'Unknown service'] }, count: 1 } },
  ]);
}

const topServices = async (req, res) => {
  try {
    const data = await getTopServices();
    if (req.query.format === 'pdf') {
      return renderReportPdf(res, 'top-services.pdf', 'Top Ranked Services',
        data.map(s => ({ label: s.name, value: `${s.count} booking${s.count === 1 ? '' : 's'}` })));
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Filters by appointment date rather than createdAt — a "monthly booking
// status" report is about what happened during that month's appointments,
// not when they happened to be booked (which could be weeks earlier).
// Buckets are mutually exclusive so they sum to the total: a cancelled
// booking counts as Cancelled even if it was rescheduled at some point;
// otherwise a rescheduled-but-still-active booking counts as Rescheduled.
async function getMonthlyBookingStatus() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const bookings = await Booking.find({ date: { $gte: start, $lt: end } });

  const buckets = { Booked: 0, Rescheduled: 0, Cancelled: 0, 'No-show': 0 };
  bookings.forEach(b => {
    if (b.status === 'cancelled') buckets.Cancelled += 1;
    else if (b.status === 'no-show') buckets['No-show'] += 1;
    else if (b.wasRescheduled) buckets.Rescheduled += 1;
    else buckets.Booked += 1;
  });
  return buckets;
}

const monthlyBookingStatus = async (req, res) => {
  try {
    const data = await getMonthlyBookingStatus();
    if (req.query.format === 'pdf') {
      const rows = Object.entries(data).map(([status, count]) => ({ label: status, value: count }));
      return renderReportPdf(res, 'monthly-booking-status.pdf', 'Monthly Booking Status (Last Month)', rows);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// One row per time slot, with a count per service-category group (Hair,
// Nails, Makeup & Lashes) — shaped for a multi-line chart with time on the
// x-axis. Masterclass bookings (if any) are excluded — not one of the
// three lines the report asks for.
async function getPeakBookingTimesByCategory() {
  const raw = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
    { $unwind: '$service' },
    { $group: { _id: { time: '$time', category: '$service.category' }, count: { $sum: 1 } } },
  ]);

  const byTime = {};
  raw.forEach(r => {
    const group = CATEGORY_GROUPS[r._id.category];
    if (!group) return;
    const time = r._id.time;
    if (!byTime[time]) byTime[time] = { time, Hair: 0, Nails: 0, 'Makeup & Lashes': 0 };
    byTime[time][group] += r.count;
  });

  return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time));
}

const peakBookingTimes = async (req, res) => {
  try {
    const data = await getPeakBookingTimesByCategory();
    if (req.query.format === 'pdf') {
      const rows = data.flatMap(row => (['Hair', 'Nails', 'Makeup & Lashes'])
        .filter(cat => row[cat] > 0)
        .map(cat => ({ label: `${row.time} — ${cat}`, value: row[cat] })));
      return renderReportPdf(res, 'peak-booking-times.pdf', 'Peak Booking Times by Category', rows);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { newAndReturningCustomers, topServices, monthlyBookingStatus, peakBookingTimes };
