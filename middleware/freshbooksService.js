const axios = require('axios');
const stripe = require('stripe')('sk_test_51QV6moK0VXG1vNgVGgBi3ANHg8T2CHBgWK4u7arXbBoPVFxl8vlNclrjVBxSW9flVwSd7V0Gw34EILll2BDxdfok000EPzr9Ds');
const { getConfig } = require('../config');
const booking = require("../models/checkoutModel")
const reservationModel = require("../models/reserveModel");
const getFreshBooksHeaders = async () => {
    const { ensureFreshBooksToken } = require('../controllers/authController');
    const accessToken = await ensureFreshBooksToken();
    return {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };
};


const createStripePaymentLink = async (amount, email, paymentType, userId, bookingId, reservation, fromAdmin) => {
    try {
        // const stripe = await getConfig('STRIPE_SECRET_KEY');
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: 'Invoice Payment',
                            description: `Payment for Invoice`,
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: email,
            success_url: `http://18.209.91.97:8133/payment-successfully?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://18.209.91.97:8133/cancel`,
            metadata: {
                amount, email, paymentType, userId, bookingId, reservation, fromAdmin
            },
        });

        return session.url;
    } catch (error) {
        console.error('Error creating Stripe payment link:', error.message);
        throw new Error('Failed to create payment link.');
    }
};


const sendInvoiceByEmail = async (invoiceId, recipients, customerName) => {
    try {
        const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
        const headers = await getFreshBooksHeaders();

        let subject = 'Your Invoice Details';
        let body = `Thank you for your business, ${customerName}. Attached is your invoice.`;

        const emailData = {
            "invoice": {
                "action_email": true,
                "email_recipients": "ujjwal.singh@aayaninfotech.com",
                "email_include_pdf": true,
                "invoice_customized_email": {
                    "subject":subject,
                    "body":body
                }
            }
        };

        const response = await axios.put(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/invoices/invoices/${invoiceId}`,
            emailData,
            { headers }
        );

        console.log('Invoice email sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending invoice email:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
};

const createInvoice = async (customerName, email, amount, paymentType, userId, bookingId, reservation, fromAdmin) => {
    try {
        console.log("In service:", customerName, email, amount, paymentType, userId, bookingId, reservation, fromAdmin);
        const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) {
            throw new Error(`Invalid amount value: ${amount}`);
        }

        const clientId = await getClientId(email, customerName);
        if (!clientId) {
            throw new Error('Client ID is required but missing.');
        }

        const clientDetails = await getClientDetails(clientId);
        if (!clientDetails || !clientDetails.fname) {
            throw new Error('Client details are incomplete.');
        }

        const fullName = `${clientDetails.username}`;


        const headers = await getFreshBooksHeaders();
        const bookingData = await booking.findById(bookingId).select('reservationId');
        const reservationData = await reservationModel.findById(bookingData.reservationId);

        const floridaTaxRate = 0.07;
        const convenienceFeeRate = 0.05;
        const damageDepositBase = 250;

        let lines = [];
        let damageDeposit = 0;
        let onlineConvenienceFee = 0;
        let taxableAmount = 0;

        if (paymentType === "Reservation") {
            const reservationPrice = 100;
            const balanceAmount = numericAmount;
            const today = new Date();
            const bookingDateObj = new Date(reservationData.pickdate);

            const isSameDay =
                today.getFullYear() === bookingDateObj.getFullYear() &&
                today.getMonth() === bookingDateObj.getMonth() &&
                today.getDate() === bookingDateObj.getDate();

            const totalBeforeFees = reservationPrice + balanceAmount;

            onlineConvenienceFee = balanceAmount * convenienceFeeRate;
            taxableAmount = totalBeforeFees + onlineConvenienceFee;

            const reservationLine = {
                name: 'Reservation Price',
                description: 'Flat reservation fee',
                qty: 1,
                unit_cost: { amount: reservationPrice, currency: 'USD' },
                ...(isSameDay && {
                    taxName1: "Florida Tax",
                    taxAmount1: floridaTaxRate * 100
                })
            };


            lines.push(
                reservationLine,
                {
                    name: 'Balance Amount',
                    description: 'Remaining balance for your reservation',
                    qty: 1,
                    unit_cost: { amount: balanceAmount, currency: 'USD' },
                    taxName1: "Florida Tax",
                    taxAmount1: floridaTaxRate * 100
                },
                {
                    name: 'Online Convenience Fee (5%)',
                    description: 'Processing fee',
                    qty: 1,
                    unit_cost: { amount: onlineConvenienceFee, currency: 'USD' },
                }
            );

        } else if (paymentType === "Final") {
            damageDeposit = damageDepositBase;
            onlineConvenienceFee = damageDeposit * convenienceFeeRate;
            taxableAmount = damageDeposit + onlineConvenienceFee;

            lines.push(
                {
                    name: 'Damage Deposit',
                    description: 'Security deposit for the vehicle',
                    qty: 1,
                    unit_cost: { amount: damageDeposit, currency: 'USD' },
                    taxName1: "Florida Tax",
                    taxAmount1: floridaTaxRate * 100
                },
                {
                    name: 'Online Convenience Fee (5%)',
                    description: 'Processing fee',
                    qty: 1,
                    unit_cost: { amount: onlineConvenienceFee, currency: 'USD' },
                }
            );
        }

        const invoiceData = {
            customerid: clientId,
            create_date: new Date().toISOString().split('T')[0],
            lines,
            customerName: fullName
        };

        const response = await axios.post(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/invoices/invoices`,
            { invoice: invoiceData },
            { headers }
        );

        const invoiceId = response.data.response.result.invoice.invoiceid;
        console.log('Invoice created successfully:', invoiceId);
        await booking.findByIdAndUpdate(
            bookingId,
            { $set: { invoiceId } },
            { new: true }
        );
        const recipients = [email];
        let subject = 'Your Invoice Details';
        let body = `Thank you for your business, ${customerName}. Attached is your invoice.`;

        let paymentLink = null;

        if (paymentType === "Final") {
            const totalAmount = damageDeposit + onlineConvenienceFee + (taxableAmount * floridaTaxRate);
            paymentLink = await createStripePaymentLink(totalAmount, email, paymentType, userId, bookingId, reservation, fromAdmin);
            subject = 'Your Damage Deposit and Vehicle Invoice with Payment Link';
            body += ` You can make a payment here: ${paymentLink}`;
        }
        console.log(paymentLink);

        await sendInvoiceByEmail(invoiceId, recipients, customerName);

        return response.data;
    } catch (error) {
        console.error('Error creating invoice:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
};


const getClientDetails = async (clientId) => {
    try {
        const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
        const headers = await getFreshBooksHeaders();

        const response = await axios.get(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/users/clients/${clientId}`,
            { headers }
        );
        return response.data.response.result.client || null;
    } catch (error) {
        console.error('Error fetching client details:', error.response?.data || error.message);
        throw new Error('Unable to fetch client details.');
    }
};


const createClient = async (email, customerName) => {
    try {
        const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
        const headers = await getFreshBooksHeaders();

        const clientData = { email: email, fname: customerName };
        const response = await axios.post(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/users/clients`,
            { client: clientData },
            { headers }
        );

        return response.data.response.result.client.id;
    } catch (error) {
        console.error('Error creating client:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw new Error(error.response?.data?.response?.errors[0]?.message || error.message);
    }
};

const getClientId = async (email, customerName) => {
    if (!email || typeof email !== "string") {
        throw new Error("Invalid email provided to getClientId.");
    }

    try {
        const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
        const headers = await getFreshBooksHeaders();

        const response = await axios.get(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/users/clients`,
            { headers }
        );
        const clients = response.data.response?.result?.clients || []; // Handle undefined `clients`

        // Find client by email
        let client = clients.find(
            (c) =>
                c.email &&
                typeof c.email === "string" &&
                c.email.trim().toLowerCase() === email.trim().toLowerCase()
        );


        // If not found, create a new client
        if (!client) {
            const clientId = await createClient(email, customerName);
            return clientId;
        }

        return client.id;
    } catch (error) {
        console.error("Error fetching client ID:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
};

const exchangeAuthorizationCodeForToken = async (code) => {
    const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
    const FRESHBOOKS_CLIENT_SECRET = await getConfig('FRESHBOOKS_CLIENT_SECRET');
    const FRESHBOOKS_REDIRECT_URI = await getConfig('FRESHBOOKS_REDIRECT_URI');

    const response = await axios.post('https://auth.freshbooks.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: FRESHBOOKS_ACCOUNT_ID,
        client_secret: FRESHBOOKS_CLIENT_SECRET,
        redirect_uri: FRESHBOOKS_REDIRECT_URI,
        code,
    });
    return response.data;
};


const recordPayment = async (email, amount, customerName) => {
    try {
        const FRESHBOOKS_ACCOUNT_ID = await getConfig('FRESHBOOKS_ACCOUNT_ID');
        if (!email || typeof email !== "string") {
            throw new Error("Invalid email provided to recordPayment.");
        }
        if (!amount || typeof amount !== "number" || amount <= 0) {
            throw new Error("Invalid amount provided to recordPayment.");
        }

        const clientId = await getClientId(email, customerName);
        if (!clientId) {
            throw new Error("Client ID is required but missing.");
        }

        const headers = await getFreshBooksHeaders();


        const invoiceResponse = await axios.get(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/invoices/invoices?client_id=${clientId}`,
            { headers }
        );

        const invoiceId = invoiceResponse.data.response.result.invoices[0]?.invoiceid;

        if (!invoiceId) {
            throw new Error("No invoice found for this client.");
        }

        const paymentData = {
            customerid: clientId,
            amount: {
                amount,
                currency: "USD",
            },
            invoiceid: invoiceId,
            date: new Date().toISOString().split("T")[0],
            payment_date: new Date().toISOString().split("T")[0],
            note: "Payment for Reservation transaction",
        };



        const response = await axios.post(
            `https://api.freshbooks.com/accounting/account/${FRESHBOOKS_ACCOUNT_ID}/payments/payments`,
            { payment: paymentData },
            { headers }
        );



        return response.data;
    } catch (error) {
        console.error("Error recording payment:", JSON.stringify(error.response?.data, null, 2));
        throw new Error(error.response?.data?.message || error.message);
    }
};

module.exports = {
    getClientId,
    createClient,
    createInvoice,
    exchangeAuthorizationCodeForToken,
    recordPayment
};



