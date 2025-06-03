const mongoose = require('mongoose');

const FreshBooksTokenSchema = new mongoose.Schema({
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model('FreshBooksToken', FreshBooksTokenSchema);
