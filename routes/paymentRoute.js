const express = require('express');
const router=  express.Router();
const {createCheckoutSession} = require('../controllers/paymentGatewayController');

router.post('/create-payment-intent', createCheckoutSession);

module.exports = router;