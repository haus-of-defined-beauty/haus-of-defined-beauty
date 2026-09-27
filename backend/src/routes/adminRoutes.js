const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/profile', protect, adminOnly, getProfile);
router.put('/profile', protect, adminOnly, updateProfile);

module.exports = router;
