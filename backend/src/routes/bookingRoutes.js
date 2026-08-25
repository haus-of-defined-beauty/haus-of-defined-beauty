const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  updateBooking,
  rescheduleBooking,
  cancelBooking,
  cancelBookingGroup,
  getAllBookings,
} = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');
const Service = require('../models/Service');

router.get('/services', protect, async (req, res) => {
  try {
    const services = await Service.find().sort('category name');
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.put('/:id', protect, adminOnly, updateBooking);
router.put('/:id/reschedule', protect, rescheduleBooking);
router.patch('/:id/cancel', protect, cancelBooking);
router.delete('/:id', protect, cancelBooking);
router.delete('/group/:groupId', protect, cancelBookingGroup);
router.get('/', protect, adminOnly, getAllBookings);

module.exports = router;
