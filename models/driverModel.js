const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');  

// Define the schema for a single image
const imageSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    contentType: { type: String, required: true }
});

const dateSchema = new mongoose.Schema({
    bookingId:{
      type: String,
      required: false
    },
    status:{ 
      type: String,
      enum: ['PENDING', 'DELIVERED', 'COMPLETED', 'NO DAMAGE'],
      default: 'PENDING'
    },
    pickDate:{ type:Date, required:false },
    dropDate:{ type:Date, required: false }
})

const driversSchema = new Schema(
    {
        
        name: { type: String, required: true },
        mobileNumber: { type: String, required: false },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        image: imageSchema,
        address: { type: String, required: false },
        availability: [{
          type: [Date],
          required: false
      }],
      driverStatus: [dateSchema],
      bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bookform',
      }],

      reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation', // Assuming there's a Reservation model
        required: false
    },
        otpExpiration: { type: Date },
        roles: {
            type: [Schema.Types.ObjectId],
            required: true,
            ref: "Role"
        }
    },
    {
        timestamps: true
    }
);

driversSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };
  
  // Before saving a driver, hash the password if it's new or modified
  driversSchema.pre('save', async function(next) {
    if (this.isModified('password') || this.isNew) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  });

module.exports = mongoose.model('Driver', driversSchema);