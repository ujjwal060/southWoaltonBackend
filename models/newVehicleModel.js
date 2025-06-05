const mongoose = require('mongoose');

const NewVehicleSchema = new mongoose.Schema({
  vname: { type: String, required: true },
  damagePrice: { type: String, required: false },
  passenger: {
    type: String,
    enum: ['fourPassenger', 'sixPassenger', 'eightPassenger'],
    required: true,
  },
  // image: { type: [String] },
  tagNumber: { type: String, required: true, unique: true },
  isAvailable: {
    type: Boolean,
    required: false,
    default: true
  },
  model: {
    type: String,
    enum: ['gas', 'electric'],
    required: true,
  },
  dailyPricingFile: {
    type: String, // URL of the daily pricing CSV file
    required: false,
  },
  twoToFourDaysPricingFile: {
    type: String, // URL of the 2-4 days pricing CSV file
    required: false,
  },
  fiveToSevenDaysPricingFile: {
    type: String, // URL of the 5-7 days pricing CSV file
    required: false,
  },
  eightToTwentySevenDaysPricingFile: {
    type: String, // URL of the 8-27 days pricing CSV file
    required: false,
  },
  twentyEightPlusPricingFile: {
    type: String, // URL of the 28+ days pricing CSV file
    required: false,
  },
  image: {
    type: String, // URL of the uploaded image
    required: false,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('NewVehicle', NewVehicleSchema);