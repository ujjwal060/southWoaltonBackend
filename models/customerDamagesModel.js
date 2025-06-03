const mongoose = require('mongoose');

const customerDamagesSchema = new mongoose.Schema({
  images: [String], // URLs for uploaded images
  paymentId: { type: String, required: true },
  DReasons: { type: [String], required: true }, // Damage reasons
  AReasons: { type: [String], required: true }, // Additional reasons
  description: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('CustomerDamage', customerDamagesSchema);
