const express = require('express');
const router = express.Router();
const { initiatePayment, payfastNotify, getPaymentStatus } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/initiate', protect, initiatePayment);
router.post('/payfast/notify', payfastNotify); // no protect — PayFast calls this directly
router.get('/group/:groupId', protect, getPaymentStatus);

module.exports = router;
