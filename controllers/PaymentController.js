const express = require('express');
const mongoose = require('mongoose');
const Payment = require('../models/PaymentModel'); // Ensure this path is correct
const fs = require('fs');
const PDFDocument = require('pdfkit');
const router = express.Router();
const { sendInvoiceEmail } = require('../middleware/emailService');


// Handler function to create and save payment info
const PaymentInfo = async (req, res) => {
    try {
        // Create a new Payment instance with data from req.body
        const createPayment = new Payment(req.body);

        // Save the new Payment document to the database
        const savedPayment = await createPayment.save();

        // Send a success response with the saved document
        res.status(201).json(savedPayment);
    } catch (error) {
        // Send an error response if something goes wrong
        res.status(400).json({ message: error.message });
    }
};

// Handler function to fetch all payment records
const getAllPayments = async (req, res) => {
    try {
        // Fetch all documents from the Payment collection
        const payments = await Payment.find();

        // Send a success response with the list of payments
        res.status(200).json(payments);
    } catch (error) {
        // Send an error response if something goes wrong
        res.status(500).json({ message: error.message });
    }
};

const generateInvoice = async (req, res) => {
    const { paymentId } = req.params;

    try {
        // Fetch the payment details by paymentId
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Create a new PDF document
        const doc = new PDFDocument();

        // Set headers for the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${paymentId}.pdf`);

        // Pipe the PDF stream to the response
        doc.pipe(res);

        // Add invoice content to the PDF
        doc
            .fontSize(25)
            .text('Invoice', { align: 'center' })
            .moveDown();

        doc.fontSize(14).text(`Invoice ID: ${paymentId}`);
        doc.text(`Transaction ID: ${payment.transactionId}`);
        doc.text(`User ID: ${payment.userId}`);
        doc.text(`Email: ${payment.email}`);
        doc.text(`Phone: ${payment.phone}`);
        doc.text(`Booking ID: ${payment.bookingId}`);
        doc.text(`Reservation: ${payment.reservation}`);
        doc.text(`Amount Paid: ₹${payment.amount}`);
        doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);

        // Footer
        doc
            .moveDown()
            .fontSize(10)
            .text('Thank you for your payment!', { align: 'center' });

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Failed to generate invoice' });
    }
};

//invoicewithdetailsto user mail

const sendInvoiceWithMail = async (req, res) => {
    try {
        const { paymentId } = req.params;

        // Fetch payment details from the database
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Send invoice email
        const emailResponse = await sendInvoiceEmail(payment);

        return res.status(200).json({
            success: true,
            message: 'Invoice email sent successfully',
            emailResponse,
        });
    } catch (error) {
        console.error('Error in sendInvoice:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


// Export the handler functions
module.exports = {
    PaymentInfo,
    getAllPayments,
    generateInvoice,
    sendInvoiceWithMail
};
