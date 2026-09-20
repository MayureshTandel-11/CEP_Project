const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { wellness, wellnessScore } = require('../controllers/wellnessController');

const router = express.Router();
router.get('/', requireAuth, wellness);
module.exports = { wellnessRoutes: router, wellnessScore };
