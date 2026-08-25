const express = require('express');
const router = express.Router();
const { getCalendar, getCalendarByDate, addSlot, removeSlot } = require('../controllers/calendarController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getCalendar);
router.get('/:date', protect, getCalendarByDate);
router.post('/:date/slots', protect, adminOnly, addSlot);
router.delete('/:date/slots/:slotId', protect, adminOnly, removeSlot);

module.exports = router;
