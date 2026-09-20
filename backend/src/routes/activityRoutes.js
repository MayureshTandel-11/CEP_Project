const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { today, weekly, activities } = require('../controllers/activityController');

const router = express.Router();
router.get('/weekly', requireAuth, weekly);
router.get('/', requireAuth, today);
module.exports = { activityRecRoutes: router, activities };
