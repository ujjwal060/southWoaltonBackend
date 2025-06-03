const Vehicle = require("../models/vehicleModel")
const getVehicles = async (req, res) => {
    try {
        let vehicles = await Vehicle.find();
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// Get vehicle by ID
const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;  // Extract the vehicle ID from the request parameters
        const vehicle = await Vehicle.findById(id);  // Fetch the vehicle by its ID
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });  // Handle case where vehicle is not found
        }
        res.json(vehicle);  // Respond with the vehicle data
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


module.exports = {
    getVehicles,getVehicleById
}

