const Vehicle = require("../models/vehicleModel")
const getVehicles = async (req, res) => {
    try {
        let vehicles = await Vehicle.find();
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await Vehicle.findById(id); 
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' }); 
        }
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


module.exports = {
    getVehicles,getVehicleById
}

