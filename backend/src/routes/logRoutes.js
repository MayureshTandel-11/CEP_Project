const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createLog, listLogs, updateLog, deleteLog } = require('../controllers/logController');

const router = express.Router();
router.post('/', requireAuth, createLog);
router.get('/', requireAuth, listLogs);
router.put('/:id', requireAuth, updateLog);
router.delete('/:id', requireAuth, deleteLog);
module.exports = router;
