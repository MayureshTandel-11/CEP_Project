const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/profileController');

const router = express.Router();
router.get('/options', ctrl.profileOptions);
router.get('/', requireAuth, ctrl.readProfile);
router.put('/', requireAuth, ctrl.writeProfile);
module.exports = router;
