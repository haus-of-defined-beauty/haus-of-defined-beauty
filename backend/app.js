require('dotenv').config();
// The local dev machine's default DNS resolver refuses SRV-type queries (needed
// for the mongodb+srv:// connection string), even though the record itself
// resolves fine elsewhere — pointing Node at a public resolver works around it.
// Hosted environments resolve it fine, so this is skipped in production.
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDb } = require('./src/db');

const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/adminRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const masterclassRoutes = require('./src/routes/masterclassRoutes');
const reminderRoutes = require('./src/routes/reminderRoutes');

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

// Queries shouldn't sit in a buffer waiting for a connection that may never
// come — without this a connection problem surfaces to the customer as
// "Operation `admins.findOne()` buffering timed out after 10000ms" ten
// seconds later. The middleware below waits for the connection properly and
// says something useful if it can't be had.
mongoose.set('bufferCommands', false);

// A liveness check that deliberately needs no database, so it still answers
// while the database is unreachable.
app.get('/', (req, res) => res.json({ message: 'Haus of Defined Beauty API' }));

app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    console.error('[DB] connection failed:', err.message);
    res.status(503).json({
      code: 'DB_UNAVAILABLE',
      message: 'We cannot reach the database at the moment. Please try again in a few minutes.',
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/masterclass', masterclassRoutes);
app.use('/api/reminders', reminderRoutes);

module.exports = app;
