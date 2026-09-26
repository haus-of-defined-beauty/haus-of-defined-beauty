const express = require('express');
const router = express.Router();
const { apply } = require('../controllers/masterclassController');

router.post('/apply', apply);

module.exports = router;
