const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { healthMetrics } = require('../controllers/healthController');

const router = express.Router();
router.get('/', requireAuth, healthMetrics);
module.exports = router;
