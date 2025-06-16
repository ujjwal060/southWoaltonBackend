const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerDriverSchema = new Schema({
    dphone: { type: String, required: true },
    demail: { type: String, required: true },
    dname: { type: String, required: true },
    dpolicy: { type: String, required: true }, // Storing image URL or path
    dlicense: { type: String, required: true }, // Storing image URL or path
})
const BookformSchema = new Schema({
    bname: { type: String, required: true },
    bphone: { type: Number, required: true },
    bemail: { type: String, required: true },
    bsize: { type: String, required: true },
    baddress: { type: String, required: true },
    baddressh: { type: String, required: false },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: false },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: false },
    vehicleId: { type: String, required: false },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    status: { type: String, enum: ['PENDING', 'DELIVERED', 'COMPLETED'], default: 'PENDING' },
    fromAdmin: { type: Boolean, default: false },
    invoiceId:{type:Number},
    // Adding customerDrivers
    customerDrivers: [CustomerDriverSchema]
}, { timestamps: true });

BookformSchema.pre('save', async function (next) {
    if (this.isModified('status') && this.status === 'COMPLETED') {
        await this.remove();
    }
    next();
});

module.exports = mongoose.model('Bookform', BookformSchema);
