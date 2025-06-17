// signModel.js
const mongoose = require('mongoose');

const signSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, required: false }, // Ensure this field is named `image`
    pdf: { type: String, required: false },
    trackingNumber: { type: String, required: true, unique: true }
}, {
    timestamps: true
});

function generate4DigitCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

signSchema.pre('save', async function (next) {
  if (this.trackingNumber) return next();

  let isUnique = false;
  let attempt = 0;

  while (!isUnique && attempt < 10) {
    const code = generate4DigitCode();
    const existing = await mongoose.models.Sign.findOne({ trackingNumber: code });

    if (!existing) {
      this.trackingNumber = code;
      isUnique = true;
    }

    attempt++;
  }

  if (!isUnique) {
    return next(new Error("Unable to generate a unique tracking number after multiple attempts."));
  }

  next();
});

module.exports = mongoose.model('Sign', signSchema);
