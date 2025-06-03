const express = require('express');
const mongoose = require('mongoose');
const Reserve = require('../models/reserveModel');
const Payment = require('../models/PaymentModel');
const router = express.Router();
const createError = require('../middleware/error')
const createSuccess = require('../middleware/success')
const Vehicle = require('../models/vehicleModel');
const Bookform = require('../models/checkoutModel'); 


const createReservation = async (req, res) => {
    try {
        const reserveform = new Reserve(req.body);
        const savedForm = await reserveform.save();
        res.status(201).json({ id: savedForm._id });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const getAllReservations = async (req, res) => {
    try {
        const reservations = await Reserve.find();
        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single reservation by ID
const getReservationById = async (req, res) => {
    try {
        const reservation = await Reserve.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }
        res.status(200).json(reservation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a reservation
const updateReservation = async (req, res, next) => {
    try {
        const updatedReservation = await Reserve.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // This option returns the updated document
        );
        if (!updatedReservation) {
            return next(createError(404, "Reservation not found"))
        }
        return next(createSuccess(200, "Update succesfull", updatedReservation))
    } catch (error) {
        return next(createError(500, "Internal Server Error"))
    }
};

const getLatestPaymentByUserId = async (req, res, next) => {
    const { userId } = req.params;

    try {

        const latestPayment = await Payment.findOne({ userId }).sort({ createdAt: -1 });

        if (!latestPayment) {
            return next(createError(404, "Payment not found"));
        }


        const filteredPayment = {
            _id: latestPayment._id,
            transactionId: latestPayment.transactionId,
            bookingId: latestPayment.bookingId,
            reservation: latestPayment.reservation,
            userId: latestPayment.userId,
        };

        let filteredReservationDetails = null;
        let filteredVehicleDetails = null;
        let bookingDetails = null;

           if (latestPayment.reservation) {
            const reservationDetails = await Reserve.findOne({ _id: latestPayment.reservation });

            if (reservationDetails) {
                filteredReservationDetails = {
                    _id: reservationDetails._id,
                    pickup: reservationDetails.pickup,
                    drop: reservationDetails.drop,
                    pickdate: reservationDetails.pickdate,
                    dropdate: reservationDetails.dropdate,
                };


                if (reservationDetails.vehicleId) {
                    const vehicleDetails = await Vehicle.findOne({ _id: reservationDetails.vehicleId });

                    if (vehicleDetails) {
                        filteredVehicleDetails = {
                            _id: vehicleDetails._id,
                            vname: vehicleDetails.vname,
                            passenger: vehicleDetails.passenger,
                            image: vehicleDetails.image,
                            tagNumber: vehicleDetails.tagNumber
                        };
                    }
                }
            }
        }

        if (latestPayment.bookingId) {
            const booking = await Bookform.findOne({ _id: latestPayment.bookingId });

            if (booking) {
                bookingDetails = {
                    _id: booking._id,
                    customerDrivers: booking.customerDrivers,
                    status: booking.status,
                   
                };
            }
        }

        return next(createSuccess(200, "Latest Payment Details", {
            payment: filteredPayment,
            reservationDetails: filteredReservationDetails,
            vehicleDetails: filteredVehicleDetails,
            bookingDetails: bookingDetails, 
        }));
    } catch (error) {
        console.error(error);
        return next(createError(500, "Internal Server Error"));
    }
};



module.exports = {
    createReservation,
    getAllReservations,
    getReservationById,
    updateReservation,
    getLatestPaymentByUserId
};
