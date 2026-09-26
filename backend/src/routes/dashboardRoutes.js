const express = require('express');
const router = express.Router();
const { getSchedule, getHistory, getCancelledAwaitingRefund, markRefunded } = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/schedule', protect, adminOnly, getSchedule);
router.get('/history', protect, adminOnly, getHistory);
router.get('/cancelled', protect, adminOnly, getCancelledAwaitingRefund);
router.patch('/refund/:paymentId', protect, adminOnly, markRefunded);

module.exports = router;
