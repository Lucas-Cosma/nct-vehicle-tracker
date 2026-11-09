
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/vehicleController');

const router = express.Router();

// Require authentication before accessing vehicle information.
router.use(requireAuth);

// Add a new vehicle to the logged-in user's account.
router.post('/', controller.createVehicle);

// Get all vehicles belonging to the logged-in user.
router.get('/', controller.getVehicles);

module.exports = router;
