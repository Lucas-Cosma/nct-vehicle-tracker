const express = require('express');
const controller = require('../controllers/devController');

const router = express.Router();

router.post('/sample-car', controller.createSampleCar);
router.post('/reminders/run', controller.runReminders);
router.get('/notifications', controller.listNotifications);

module.exports = router;
