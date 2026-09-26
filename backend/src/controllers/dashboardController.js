const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function rangeForPeriod(period, customDate) {
  const today = new Date();
  if (period === 'tomorrow') {
    const t = new Date(today); t.setDate(t.getDate() + 1);
    return [startOfDay(t), endOfDay(t)];
  }
  if (period === 'week') {
    const end = new Date(today); end.setDate(end.getDate() + 6);
    return [startOfDay(today), endOfDay(end)];
  }
  if (period === 'date' && customDate) {
    const d = new Date(customDate);
    return [startOfDay(d), endOfDay(d)];
  }
  return [startOfDay(today), endOfDay(today)]; // 'today' / default
}

// Up-to-date schedule — bookings for a selected period (today / tomorrow /
// this week / a picked date), soonest first.
const getSchedule = async (req, res) => {
  try {
    const { period = 'today', date } = req.query;
    const [start, end] = rangeForPeriod(period, date);
    const bookings = await Booking.find({
      date: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed', 'completed'] },
    }).populate('customerId serviceId').sort('date time');

    res.json(bookings.map(b => ({
      id: b._id,
      date: b.date,
      time: b.time,
      client: b.customerId?.name || '—',
      service: b.serviceId?.name || '—',
      duration: b.serviceId?.duration ?? null,
      status: b.status,
      amount: b.serviceId?.price ?? null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Booking history — most recently completed appointments.
const getHistory = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'completed' })
      .populate('customerId serviceId')
      .sort('-date -time')
      .limit(10);

    res.json(bookings.map(b => ({
      id: b._id,
      client: b.customerId?.name || '—',
      service: b.serviceId?.name || '—',
      date: b.date,
      time: b.time,
      amount: b.serviceId?.price ?? null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancelled bookings whose booking fee was actually paid and hasn't been
// refunded yet. "Amount" here is the real R100 fee (payment.amount) — the
// only money that actually moved through the app — not the service price.
const getCancelledAwaitingRefund = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'cancelled' })
      .populate('customerId serviceId')
      .sort('-updatedAt');
    const groupIds = [...new Set(bookings.map(b => b.groupId.toString()))];
    const payments = await Payment.find({ groupId: { $in: groupIds }, status: 'successful' });
    const paymentByGroup = {};
    payments.forEach(p => { paymentByGroup[p.groupId.toString()] = p; });

    const rows = bookings
      .map(b => ({ booking: b, payment: paymentByGroup[b.groupId.toString()] }))
      .filter(({ payment }) => payment && payment.refundStatus !== 'refunded');

    const total = rows.reduce((sum, { payment }) => sum + payment.amount, 0);

    res.json({
      total,
      rows: rows.map(({ booking: b, payment: p }) => ({
        bookingId: b._id,
        paymentId: p._id,
        client: b.customerId?.name || '—',
        service: b.serviceId?.name || '—',
        date: b.date,
        amount: p.amount,
        refundStatus: p.refundStatus,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markRefunded = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    payment.refundStatus = 'refunded';
    await payment.save();
    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSchedule, getHistory, getCancelledAwaitingRefund, markRefunded };
