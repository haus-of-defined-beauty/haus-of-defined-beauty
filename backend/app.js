require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/adminRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());
// PayFast's ITN webhook posts application/x-www-form-urlencoded; the raw
// bytes are captured here since signature verification must hash exactly
// what PayFast sent, not a re-encoded reconstruction of the parsed body.
app.use(express.urlencoded({
  extended: false,
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => res.json({ message: 'Haus of Defined Beauty API' }));

module.exports = app;
