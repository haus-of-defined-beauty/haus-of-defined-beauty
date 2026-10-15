const express = require('express');
const router = express.Router();
const { initiatePayment, payfastNotify, getPaymentStatus } = require('../controllers/paymentController');
const { protect, customerOnly } = require('../middleware/auth');

router.post('/initiate', protect, customerOnly, initiatePayment);
router.post('/payfast/notify', payfastNotify); // no protect — PayFast calls this directly
router.get('/group/:groupId', protect, customerOnly, getPaymentStatus);

module.exports = router;
