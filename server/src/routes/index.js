const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdminKey } = require('../middleware/adminKey');
const { devOnly } = require('../middleware/devOnly');
const healthRoutes = require('./healthRoutes');
const preferenceRoutes = require('./preferenceRoutes');
const devRoutes = require('./devRoutes');
const vehicleRoutes = require('./vehicleRoutes');

const router = express.Router();


router.use('/health', healthRoutes);
router.use('/users/me/preferences', requireAuth, preferenceRoutes);
router.use('/dev', devOnly, requireAdminKey, devRoutes);
router.use('/vehicles', vehicleRoutes);
module.exports = router;
