const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { submit, listFeedback } = require('../controllers/feedbackController');

const router = express.Router();
router.post('/', requireAuth, submit);
router.get('/', requireAuth, listFeedback);
module.exports = router;
