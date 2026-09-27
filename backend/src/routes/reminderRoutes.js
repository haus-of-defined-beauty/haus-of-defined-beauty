const express = require('express');
const router = express.Router();
const { sendReminders } = require('../controllers/reminderController');

// No protect/adminOnly here on purpose — the caller is a scheduled job with
// no user session. sendReminders checks its own shared-secret header.
router.post('/send', sendReminders);

module.exports = router;
