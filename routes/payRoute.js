const express = require('express');
const router = express.Router();

const { PaymentInfo,getAllPayments,generateInvoice,sendInvoiceWithMail } = require('../controllers/PaymentController');

router.post('/register',PaymentInfo);
router.get('/pay', getAllPayments); 
router.get('/invoice/:paymentId', generateInvoice);
router.post('/send-invoice/:paymentId', sendInvoiceWithMail);



module.exports = router;