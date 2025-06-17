// signModel.js
const mongoose = require('mongoose');

const signSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, required: false }, // Ensure this field is named `image`
    pdf: { type: String, required: false },
}, {
    timestamps: true
});

module.exports = mongoose.model('Sign', signSchema);
