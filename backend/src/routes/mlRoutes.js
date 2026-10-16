const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { explanation, retrainFromFeedback } = require('../controllers/mlController');

const router = express.Router();
router.get('/explanation', requireAuth, explanation);
// Retraining replaces the shared model for every user, so it is admin-only.
router.post('/retrain', requireAuth, requireAdmin, retrainFromFeedback);
module.exports = router;
