const express = require('express');
const controller = require('../controllers/preferenceController');

const router = express.Router();

router.get('/', controller.getPreferences);
router.patch('/', controller.updatePreferences);

module.exports = router;
