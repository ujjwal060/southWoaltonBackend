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
            type: String,
            require: false
        },
        amount: {
            type: String,
            require: false
        }

    }
    , {
        timestamps: true
    }
)
module.exports = mongoose.model('Payment', paymentSchema);