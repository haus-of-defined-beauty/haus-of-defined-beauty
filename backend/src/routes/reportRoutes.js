const express = require('express');
const router = express.Router();
const { newAndReturningCustomers, topServices, monthlyBookingStatus, peakBookingTimes } = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/customers', protect, adminOnly, newAndReturningCustomers);
router.get('/services', protect, adminOnly, topServices);
router.get('/monthly', protect, adminOnly, monthlyBookingStatus);
router.get('/peak-times', protect, adminOnly, peakBookingTimes);

module.exports = router;
