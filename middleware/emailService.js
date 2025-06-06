const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ujjwalkumarsingh888@gmail.com',
        pass: 'bind deyf lnwl rzix',
    },
});

const sendInvoiceEmail = async (payment) => {
    const mailOptions = {
        from: 'ujjwalkumarsingh888@gmail.com',
        to: payment.email,
        subject: 'Invoice for Your Payment',
        html: `
            <h2>Invoice Details</h2>
            <p>Thank you for your payment.</p>
            <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
            <p><strong>Booking ID:</strong> ${payment.bookingId}</p>
            <p><strong>Amount:</strong> ${payment.amount}</p>
            <p><strong>Reservation:</strong> ${payment.reservation}</p>
            <p><strong>Phone:</strong> ${payment.phone}</p>
            <p><strong>Timestamp:</strong> ${payment.createdAt}</p>
            <p>We appreciate your business!</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: 'Invoice sent successfully' };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send invoice email');
    }
};

module.exports = {sendInvoiceEmail };
