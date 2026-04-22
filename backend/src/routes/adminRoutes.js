const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/profile', protect, adminOnly, getProfile);

module.exports = router;
