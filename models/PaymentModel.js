const mongoose = require('mongoose');
const paymentSchema = mongoose.Schema(
    {
        userId: {
            type: String,
            require: false
        },
        phone: {
            type: String,
            require: false
        },
        transactionId: {
            type: String,
            require: false
        },
        email: {
            type: String,
            require: false
        },
        bookingId: {
            type: String,
            require: false
        },
        reservation: {
            type: Boolean,
            require: false
        },
         reservationId: {
            type: mongoose.Schema.Types.ObjectId,
            require: false
        },
        amount: {
            type: String,
            require: false
        },
        fromAdmin: {
            type: Boolean,
            required: false,
            default: false
        },
        paymentDetails: {
            paymentMethod: { type: String, required: true },
            paymentId: { type: String, required: true },
            sessionId: { type: String, required: true },
            paymentStatus: {
                type: String,
                enum: ["Pending", "Paid", "Failed"], // Ensure "Paid" is included
                required: true,
            },
            transactionDetails: { type: Object },
        },
        paymentType: {
            type: String,
            enum: ["Reservation", "Booking"],
            required: false,
        },
        mailSent: {
            type: Boolean,
            required: false,
            default: false
        }
    }
    , {
        timestamps: true
    }
)
module.exports = mongoose.model('Payment', paymentSchema);