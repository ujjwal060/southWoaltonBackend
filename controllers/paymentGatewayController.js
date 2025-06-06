require('dotenv').config()
const secretKey = process.env.STRIPE_SECRET_KEY
// const stripe = require('stripe')(secretKey);
const { v4: uuidv4 } = require('uuid');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


//For Reservation Price ($100)

const createCheckoutSession = async (req, res) => {
    try {
        const { amountInDollars, userId, bookingId, reservation, fromAdmin, paymentType } = req.body;

        if (!amountInDollars || !reservation || !fromAdmin || !paymentType) {
            return res.status(400).json({ error: "All fields (amountInDollars, reservation,fromAdmin,paymentType) are required" });
        }

        // Amount Breakdown
        const reservationAmount = 100;
        const reservationTax = reservationAmount * 0.07; // Florida Tax (7%)
        const reservationFee = reservationAmount * 0.05; // Online Convenience Fee (5%)
        const reservationPrice = reservationAmount + reservationTax + reservationFee;

        const vehicleRental = amountInDollars - reservationPrice;
        const vehiclePrice = vehicleRental / 1.12; // Remove 12% (7% Tax + 5% Fee)
        const vehicleTax = vehiclePrice * 0.07; // Florida Tax
        const vehicleFee = vehiclePrice * 0.05; // Online Convenience Fee

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
                              - Online Convenience Fee (5%): $${reservationFee.toFixed(2)}
                            
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
            success_url: `http://18.209.91.97:8133/payment-successfully?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: "http://18.209.91.97:8133/cancel",
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
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};







module.exports = {
     createCheckoutSession
};
