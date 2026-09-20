const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { explanation, retrainFromFeedback } = require('../controllers/mlController');

const router = express.Router();
router.get('/explanation', requireAuth, explanation);
router.post('/retrain', requireAuth, retrainFromFeedback);
module.exports = router;
