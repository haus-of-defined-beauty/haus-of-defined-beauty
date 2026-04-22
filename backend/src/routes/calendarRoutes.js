const express = require('express');
const router = express.Router();
const { getCalendar, updateCalendar } = require('../controllers/calendarController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getCalendar);
router.put('/', protect, adminOnly, updateCalendar);

module.exports = router;
