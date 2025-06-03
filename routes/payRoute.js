const express = require('express');
const router = express.Router();

const { PaymentInfo,getAllPayments,generateInvoice,sendInvoiceWithMail,completePayment,sendPaymentLinksInAdvance } = require('../controllers/PaymentController');

router.post('/register',PaymentInfo);
router.get('/pay', getAllPayments); 
router.get('/invoice/:paymentId', generateInvoice);
router.post('/send-invoice/:paymentId', sendInvoiceWithMail);
router.get('/complete-payment', completePayment);

module.exports = router;