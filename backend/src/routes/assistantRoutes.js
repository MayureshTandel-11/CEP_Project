const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { status, assistant } = require('../controllers/assistantController');

const router = express.Router();
router.get('/status', requireAuth, status);
router.post('/', requireAuth, assistant);
module.exports = router;
