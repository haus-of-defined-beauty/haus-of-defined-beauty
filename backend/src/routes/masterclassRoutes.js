const express = require('express');
const router = express.Router();
const { apply, listApplications } = require('../controllers/masterclassController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/apply', apply);
router.get('/applications', protect, adminOnly, listApplications);

module.exports = router;
