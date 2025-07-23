require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const { getConfig } = require('../config');
const reservationModel=require("../models/reserveModel");
const bookingModel=require("../models/checkoutModel");


const createCheckoutSession = async (req, res) => {
    try {
        // const stripe=await getConfig('STRIPE_SECRET_KEY')
        const { amountInDollars, userId, bookingId, reservation, fromAdmin, paymentType } = req.body;

        if (!amountInDollars || !reservation || !fromAdmin || !paymentType) {
            return res.status(400).json({ error: "All fields (amountInDollars, reservation,fromAdmin,paymentType) are required" });
        }

        const bookingData=await bookingModel.findById(bookingId).select('reservationId');
        const reservationData=await reservationModel.findById(bookingData.reservationId);

        const reservationAmount = 100;

        const today = new Date();
        const bookingDateObj = new Date(reservationData.pickdate);

        const isSameDay =
            today.getFullYear() === bookingDateObj.getFullYear() &&
            today.getMonth() === bookingDateObj.getMonth() &&
            today.getDate() === bookingDateObj.getDate();

        const reservationTax = isSameDay ? reservationAmount * 0.07 : 0;
        const reservationPrice = reservationAmount + reservationTax;

        const vehicleRental = amountInDollars - reservationPrice;
        const vehiclePrice = vehicleRental / 1.12;
        const vehicleTax = vehiclePrice * 0.07;
        const vehicleFee = vehiclePrice * 0.05;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Payment for Vehicle Rental and Reservation Price",
                            description: `
                            Reservation Price: $${reservationPrice.toFixed(2)}
                              - Reservation Amount: $${reservationAmount.toFixed(2)}
                              - Florida Tax (7%): $${reservationTax.toFixed(2)}
                            
                            Vehicle Rental: $${vehicleRental.toFixed(2)}
                              - Vehicle Price: $${vehiclePrice.toFixed(2)}
                              - Florida Tax (7%): $${vehicleTax.toFixed(2)}
                              - Online Convenience Fee (5%): $${vehicleFee.toFixed(2)}
                            
                            Total Amount: $${amountInDollars.toFixed(2)}
                            `,
                        },
                        unit_amount: amountInDollars * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `http://98.85.246.54:8133/payment-successfully?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: "http://98.85.246.54:8133/cancel",
            metadata: {
                userId,
                bookingId,
                reservation,
                fromAdmin,
                paymentType,
                amountInDollars
            },
        });

        res.status(200).json({ session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCheckoutSession
};
