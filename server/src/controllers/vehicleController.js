
const Vehicle = require('../models/Vehicle');
const AppError = require('../utils/AppError');
const { validateVehicleInput } = require('../utils/vehicleValidator');

// Add a new vehicle to the logged-in user's account.
async function createVehicle(req, res) {
  // Validate and clean the vehicle details sent by the user.
  const data = validateVehicleInput(req.body);

  // Get the owner ID from authentication, not from the request body.
  const vehicle = await Vehicle.create({
    ...data,
    owner: req.user.id,
  });

  // Return the newly created vehicle.
  res.status(201).json({ vehicle });
}

// Retrieve all vehicles belonging to the logged-in user.
async function getVehicles(req, res) {
  // Only find vehicles owned by the current user.
  const vehicles = await Vehicle.find({
    owner: req.user.id,
  }).sort({ createdAt: -1 });

  // Return the user's vehicles.
  res.json({ vehicles });
}

// Export the controller functions so the routes can use them.
module.exports = {
  createVehicle,
  getVehicles,
};
