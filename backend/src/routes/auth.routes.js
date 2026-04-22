const express = require('express');
const router = express.Router();
const { devLogin, googleCallback } = require('../controllers/authController');

router.post('/dev-login', devLogin);
router.post('/google', googleCallback);
router.post('/otp/send', (req, res) => res.json({ message: 'OTP send endpoint' }));
router.post('/otp/verify', (req, res) => res.json({ message: 'OTP verify endpoint' }));

module.exports = router;
