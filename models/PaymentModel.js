const { required } = require("joi");
const mongoose = require("mongoose");
const paymentSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      require: false,
    },
    phone: {
      type: String,
      require: false,
    },
    transactionId: {
      type: String,
      require: false,
    },
    email: {
      type: String,
      require: false,
      validate: {
        validator: function (v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    bookingId: {
      type: String,
      require: false,
    },
    reservation: {
      type: Boolean,
      require: false,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      require: false,
    },
    amount: {
      type: String,
      require: false,
    },
    fromAdmin: {
      type: Boolean,
      required: false,
      default: false,
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
    invoiceId: { type: Number, required: true },
    invoiceNumber: { type: String, required: true },
    paymentType: {
      type: String,
      enum: ["Reservation", "Booking", "Both"],
      required: false,
    },
    mailSent: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Payment", paymentSchema);
