const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, updateBooking, cancelBooking, getAllBookings } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.put('/:id', protect, updateBooking);
router.delete('/:id', protect, cancelBooking);
router.get('/', protect, adminOnly, getAllBookings);

module.exports = router;
