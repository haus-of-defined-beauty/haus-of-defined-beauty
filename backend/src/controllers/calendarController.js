const Calendar = require('../models/Calendar');

const getCalendar = async (req, res) => {
  try {
    const calendar = await Calendar.find();
    res.json(calendar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateCalendar = async (req, res) => {
  try {
    const { date, availableSlots, blockedSlots, blockedDates } = req.body;
    const day = await Calendar.findOneAndUpdate(
      { date: new Date(date) },
      { availableSlots, blockedSlots, blockedDates },
      { new: true, upsert: true }
    );
    res.json(day);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCalendar, updateCalendar };
