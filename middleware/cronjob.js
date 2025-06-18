const cron = require('node-cron');
const Payment = require('../models/PaymentModel');
const Reservation = require('../models/reserveModel');
const emailService = require('./emailService');
const stripeService = require("../controllers/paymentGatewayController");
const mongoose = require('mongoose');
const { createInvoice } = require('../middleware/freshbooksService');

cron.schedule('0 0 * * *', async () => {
    console.log('Cron job started:', new Date());
    try {
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

        const targetDateUTC = new Date(todayUTC);
        const endDateUTC = new Date(todayUTC);
        endDateUTC.setDate(todayUTC.getDate() + 21);
    
        const payments = await Payment.find({
            paymentType: 'Reservation',
            mailSent: false,
        });
      

        const reservationIds = payments.map(payment =>
            mongoose.Types.ObjectId.isValid(payment.reservation) ? new mongoose.Types.ObjectId(payment.reservation) : null
        ).filter(Boolean);
       
        const allReservations = await Reservation.find({ _id: { $in: reservationIds } });
    

        const reservations = await Reservation.find({
            _id: { $in: reservationIds },
            pickdate: {
                $gte: targetDateUTC,
                $lte: endDateUTC,
            },
        });
       

        for (const payment of payments) {
            const reservation = reservations.find(res => res._id.toString() === payment.reservation);
            
            if (!reservation) continue;

            const pickDate = new Date(reservation.pickdate);
            const diffInDays = Math.ceil((pickDate - todayUTC) / (1000 * 60 * 60 * 24));


            const email = payment.paymentDetails.transactionDetails.payment_method.billing_details.email
            const customerName = payment.paymentDetails.transactionDetails.payment_method.billing_details.name
            console.log("customerName",customerName)

            if (diffInDays <= 15) {
                console.log(email,reservation.reserveAmount, 'Final')
                await createInvoice(customerName,email, "250", 'Final', payment.userId, payment.bookingId, payment.reservation, payment.fromAdmin);
                payment.mailSent = true;
                await payment.save();
            }
        }

        console.log('Cron job executed successfully.');
    } catch (error) {
        console.error('Error executing cron job:', error);
    }
});

