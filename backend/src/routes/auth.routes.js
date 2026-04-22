const express = require('express');
const router = express.Router();

// Placeholder — wire up Google OAuth / OTP strategy here
router.post('/google', (req, res) => res.json({ message: 'Google OAuth endpoint' }));
router.post('/otp/send', (req, res) => res.json({ message: 'OTP send endpoint' }));
router.post('/otp/verify', (req, res) => res.json({ message: 'OTP verify endpoint' }));

module.exports = router;
