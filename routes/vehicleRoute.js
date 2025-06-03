const express = require('express');
const router = express.Router();
const {getVehicles, getVehicleById} = require('../controllers/vehicleController');

// Routes
router.get('/',getVehicles);
router.get('/vehicles/:id', getVehicleById);


module.exports = router;
