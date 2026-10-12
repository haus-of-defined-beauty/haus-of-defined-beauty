const express = require('express');
const router = express.Router();
const { start, verify, signupStart, signupVerify, googleCallback } = require('../controllers/authController');

router.post('/login/start', start);
router.post('/login/verify', verify);
router.post('/signup/start', signupStart);
router.post('/signup/verify', signupVerify);
router.post('/google', googleCallback);

module.exports = router;
