const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const notify = require('../utils/notify');
const {
  generateSignature,
  verifyItnSignature,
  getProcessUrl,
  validateWithPayfast,
  isFromTrustedHost,
} = require('../utils/payfast');

const BOOKING_FEE = 100;

const initiatePayment = async (req, res) => {
  try {
    const { groupId } = req.body;
    const bookings = await Booking.find({ groupId, customerId: req.user.id });
    if (!bookings.length) return res.status(404).json({ message: 'Booking not found' });

    const payment = await Payment.create({
      groupId,
      customerId: req.user.id,
      amount: BOOKING_FEE,
      status: 'pending',
    });

    const customer = await Customer.findById(req.user.id);
    const [firstName, ...rest] = (customer?.name || '').split(' ');

    const fields = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `${process.env.FRONTEND_URL}/customer/book?payment=return&groupId=${groupId}`,
      cancel_url: `${process.env.FRONTEND_URL}/customer/book?payment=cancel&groupId=${groupId}`,
      notify_url: `${process.env.APP_PUBLIC_URL}/api/payments/payfast/notify`,
      name_first: firstName || undefined,
      name_last: rest.join(' ') || undefined,
      email_address: customer?.email || undefined,
      m_payment_id: payment._id.toString(),
      amount: BOOKING_FEE.toFixed(2),
      item_name: 'Haus of Defined Beauty booking fee',
      custom_str1: groupId.toString(),
    };

    const signature = generateSignature(fields, process.env.PAYFAST_PASSPHRASE);

    res.status(201).json({ processUrl: getProcessUrl(), fields: { ...fields, signature } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const payfastNotify = async (req, res) => {
  try {
    const rawBody = req.rawBody || '';
    const { signature, m_payment_id, pf_payment_id, payment_status, amount_gross } = req.body;

    if (!verifyItnSignature(rawBody, signature, process.env.PAYFAST_PASSPHRASE)) {
      console.error('[PayFast ITN] signature mismatch');
      return res.status(400).send('invalid signature');
    }

    const validated = await validateWithPayfast(rawBody);
    if (!validated) {
      console.error('[PayFast ITN] server-to-server validation failed');
      return res.status(400).send('validation failed');
    }

    isFromTrustedHost(req.ip).then(trusted => {
      if (!trusted) console.warn('[PayFast ITN] request did not resolve to a known PayFast host', req.ip);
    });

    const payment = await Payment.findById(m_payment_id);
    if (!payment) {
      console.error('[PayFast ITN] unknown m_payment_id', m_payment_id);
      return res.status(404).send('unknown payment');
    }

    if (parseFloat(amount_gross) !== payment.amount) {
      console.error('[PayFast ITN] amount mismatch', amount_gross, payment.amount);
      return res.status(400).send('amount mismatch');
    }

    if (payment_status === 'COMPLETE') {
      payment.status = 'successful';
      payment.gatewayReference = pf_payment_id;
      await payment.save();
      await Booking.updateMany({ groupId: payment.groupId }, { status: 'confirmed' });

      const customer = await Customer.findById(payment.customerId);
      const bookings = await Booking.find({ groupId: payment.groupId }).populate('serviceId');
      const dateTimeList = bookings
        .map(b => `${new Date(b.date).toLocaleDateString('en-ZA')} at ${b.time}`)
        .join('; ');
      const admins = await Admin.find().select('email');

      admins.forEach(a => notify(
        a.email,
        `Payment received for ${customer?.name || 'a customer'}, booking confirmed for ${dateTimeList}.`
      ));
      notify(
        customer?.email,
        `Your payment was received, booking confirmed for ${dateTimeList}. See you soon!`
      );
    } else if (payment_status === 'FAILED' || payment_status === 'CANCELLED') {
      payment.status = 'failed';
      payment.gatewayReference = pf_payment_id;
      await payment.save();
    }
    // PENDING: no state change yet — wait for a later, final ITN.

    res.status(200).send('OK');
  } catch (err) {
    console.error('[PayFast ITN] error', err.message);
    res.status(500).send('error');
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    const bookings = await Booking.find({ groupId, customerId: req.user.id });
    if (!bookings.length) return res.status(404).json({ message: 'Booking not found' });

    const payment = await Payment.findOne({ groupId }).sort({ createdAt: -1 });
    res.json({
      payment,
      bookingStatus: bookings[0]?.status,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { initiatePayment, payfastNotify, getPaymentStatus };
