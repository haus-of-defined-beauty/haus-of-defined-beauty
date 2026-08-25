const express = require('express');
const router = express.Router();
const { start, verify, googleCallback } = require('../controllers/authController');

router.post('/login/start', start);
router.post('/login/verify', verify);
router.post('/google', googleCallback);

module.exports = router;
