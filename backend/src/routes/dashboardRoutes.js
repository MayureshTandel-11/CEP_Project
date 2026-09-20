const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { dashboard } = require('../controllers/dashboardController');

const router = express.Router();
router.get('/', requireAuth, dashboard);
module.exports = router;
