const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

const BOOKING_FEE = 100;

const initiatePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const payment = await Payment.create({
      bookingId,
      customerId: req.user.id,
      amount: BOOKING_FEE,
      status: 'pending',
    });

    res.status(201).json({ payment, message: 'Redirect to payment gateway' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { paymentId, gatewayReference, success } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = success ? 'successful' : 'failed';
    payment.gatewayReference = gatewayReference;
    await payment.save();

    if (success) {
      await Booking.findByIdAndUpdate(payment.bookingId, { status: 'confirmed' });
    }

    res.json({ payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { initiatePayment, confirmPayment };
