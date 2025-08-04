require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require("uuid");
const { getConfig } = require("../config");
const reservationModel = require("../models/reserveModel");
const bookingModel = require("../models/checkoutModel");

const createCheckoutSession = async (req, res) => {
  try {
    // const stripe=await getConfig('STRIPE_SECRET_KEY')
    const {
      amountInDollars,
      userId,
      bookingId,
      reservation,
      reserveId,
      fromAdmin,
      paymentType,
    } = req.body;

    if (!amountInDollars || !paymentType) {
      return res
        .status(400)
        .json({ error: "Required fields: amountInDollars, paymentType" });
    }

    let reservationData;

    if (paymentType === "Reservation") {
      if (!reservation) {
        return res.status(400).json({
          error: "Reservation ID is required for reservation payment",
        });
      }

      reservationData = await reservationModel.findById(reserveId);
    } else if (paymentType === "Booking") {
      if (!bookingId) {
        return res
          .status(400)
          .json({ error: "Booking ID is required for booking payment" });
      }

      const bookingData = await bookingModel
        .findById(bookingId)
        .select("reservationId");

      if (!bookingData || !bookingData.reservationId) {
        return res
          .status(404)
          .json({ error: "Reservation ID not found in booking" });
      }

      reservationData = await reservationModel.findById(
        bookingData.reservationId
      );
    } else {
      return res.status(400).json({ error: "Invalid paymentType" });
    }

    if (!reservationData) {
      return res.status(404).json({ error: "Reservation data not found" });
    }

    const reservationAmount = 100;
    let vehicleRental = 0;
    let vehiclePrice = 0;
    let vehicleTax = 0;
    let vehicleFee = 0;

    if (paymentType === "Booking") {
      if (reservationData.bookingType === "Reservation") {
        vehicleRental = amountInDollars - reservationAmount;
      } else {
        vehicleRental = amountInDollars;
      }

      vehiclePrice = vehicleRental / 1.12;
      vehicleTax = vehiclePrice * 0.07;
      vehicleFee = vehiclePrice * 0.05;
    }

    let description = "";

    if (paymentType === "Reservation") {
      description = `
        Reservation Price: $${reservationAmount.toFixed(2)}
        - Reservation Amount: $${reservationAmount.toFixed(2)}

        Total Amount: $${amountInDollars.toFixed(2)}
            `;
    } else if (paymentType === "Booking") {
      const includesReservation = amountInDollars > vehicleRental;

      description = `
        Reservation Price: $${reservationAmount.toFixed(2)}
        ${
          includesReservation
            ? `  - Reservation Amount: $${reservationAmount.toFixed(2)}\n`
            : ""
        }

        Vehicle Rental: $${vehicleRental.toFixed(2)}
        - Vehicle Price: $${vehiclePrice.toFixed(2)}
        - Florida Tax (7%): $${vehicleTax.toFixed(2)}
        - Online Convenience Fee (5%): $${vehicleFee.toFixed(2)}

        Total Amount: $${amountInDollars.toFixed(2)}
            `;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Payment for Vehicle Rental and Reservation Price",
              description: description,
            },
            unit_amount: amountInDollars * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://44.217.145.210:8133/payment-successfully?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: "http://44.217.145.210:8133/cancel",
      metadata: {
        userId,
        bookingId,
        reservation,
        reserveId,
        fromAdmin,
        paymentType,
        amountInDollars,
      },
    });

    res.status(200).json({ session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCheckoutSession,
};
