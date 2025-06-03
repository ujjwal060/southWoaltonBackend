const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Initialize Stripe


const getFreshBooksHeaders = async () => {
    const { ensureFreshBooksToken } = require('../controllers/authController');
    const accessToken = await ensureFreshBooksToken();
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  };

// payment link for Damage and Balance

const createStripePaymentLink = async (amount, email, paymentType,userId, bookingId,reservation,fromAdmin ) => {
    try {
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
                        unit_amount: Math.round(amount * 100), // Amount in smallest currency unit (e.g., cents for USD)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: email, // Pre-fill email in Stripe checkout
            success_url: `http://18.209.91.97:8133/payment-successfully?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://18.209.91.97:8133/cancel`,
            metadata: {
                amount, email, paymentType,userId, bookingId,reservation,fromAdmin
            },
        });

        return session.url;
    } catch (error) {
        console.error('Error creating Stripe payment link:', error.message);
        throw new Error('Failed to create payment link.');
    }
};


// Function to send invoice by email
const sendInvoiceByEmail = async (invoiceId, recipients, subject, body, includePdf = false) => {
    try {
        const headers = await getFreshBooksHeaders();

        const emailData = {
            invoice: {
                action_email: true,
                email_recipients: recipients,
                email_include_pdf: includePdf,
                invoice_customized_email: {
                    subject,
                    body,
                },
            },
        };

        const response = await axios.put(
            `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/invoices/invoices/${invoiceId}`,
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

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) {
            throw new Error(`Invalid amount value: ${amount}`);
        }

        const clientId = await getClientId(email,customerName);
        if (!clientId) {
            throw new Error('Client ID is required but missing.');
        }
      
        const clientDetails = await getClientDetails(clientId);
        if (!clientDetails || !clientDetails.fname) {
            throw new Error('Client details are incomplete.');
        }
        
        // Combine first name and last name for the customerName
        const fullName = `${clientDetails.username}`;


        const headers = await getFreshBooksHeaders();

        const floridaTaxRate = 0.07; // 7% tax
        const convenienceFeeRate = 0.05; // 5% fee
        const damageDepositBase = 250;

        let lines = [];
        let damageDeposit = 0;
        let onlineConvenienceFee = 0;
        let taxableAmount = 0;

        if (paymentType === "Reservation") {
            const reservationPrice = 100;
            const balanceAmount = numericAmount;
            const totalBeforeFees = reservationPrice + balanceAmount;
            
            onlineConvenienceFee = totalBeforeFees * convenienceFeeRate;
            taxableAmount = totalBeforeFees + onlineConvenienceFee;

            lines.push(
                {
                    name: 'Reservation Price',
                    description: 'Flat reservation fee',
                    qty: 1,
                    unit_cost: { amount: reservationPrice, currency: 'USD' },
                    taxName1: "Florida Tax",
                    taxAmount1: floridaTaxRate * 100 // Assign 7% tax
                },
                {
                    name: 'Balance Amount',
                    description: 'Remaining balance for your reservation',
                    qty: 1,
                    unit_cost: { amount: balanceAmount, currency: 'USD' },
                    taxName1: "Florida Tax",
                    taxAmount1: floridaTaxRate * 100 // Assign 7% tax
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
                    taxAmount1: floridaTaxRate * 100 // Assign 7% tax
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
            `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/invoices/invoices`,
            { invoice: invoiceData },
            { headers }
        );

        const invoiceId = response.data.response.result.invoice.id;
        console.log('Invoice created successfully:', invoiceId);

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

        await sendInvoiceByEmail(invoiceId, recipients, subject, body, true);

        return response.data;
    } catch (error) {
        console.error('Error creating invoice:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
};


const getClientDetails = async (clientId) => {
    try {
        const headers = await getFreshBooksHeaders();
        
        const response = await axios.get(
            `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/users/clients/${clientId}`,
            { headers }
        );
        return response.data.response.result.client || null;
    } catch (error) {
        console.error('Error fetching client details:', error.response?.data || error.message);
        throw new Error('Unable to fetch client details.');
    }
};


const createClient = async (email,customerName) => {
    try {
        const headers = await getFreshBooksHeaders();

        const clientData = { email:email,fname: customerName };
        const response = await axios.post(
            `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/users/clients`,
            { client: clientData },
            { headers }
        );

        return response.data.response.result.client.id;
    } catch (error) {
        console.error('Error creating client:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw new Error(error.response?.data?.response?.errors[0]?.message || error.message);
    }
};



const getClientId = async (email,customerName) => {
    if (!email || typeof email !== "string") {
      throw new Error("Invalid email provided to getClientId.");
    }
  
    try {
      const headers = await getFreshBooksHeaders(); // Use admin account token
  
      const response = await axios.get(
        `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/users/clients`,
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
        const clientId = await createClient(email,customerName);
        return clientId;
      }
  
      return client.id;
    } catch (error) {
      console.error("Error fetching client ID:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  };
  
  
  

//for token/referesh/access


const exchangeAuthorizationCodeForToken = async (code) => {
    const response = await axios.post('https://auth.freshbooks.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: process.env.FRESHBOOKS_CLIENT_ID,
        client_secret: process.env.FRESHBOOKS_CLIENT_SECRET,
        redirect_uri: process.env.FRESHBOOKS_REDIRECT_URI,
        code,
    });
    return response.data;
};

//record payment for reservation payment

const recordPayment = async (email, amount,customerName) => {
    try {
        if (!email || typeof email !== "string") {
            throw new Error("Invalid email provided to recordPayment.");
        }
        if (!amount || typeof amount !== "number" || amount <= 0) {
            throw new Error("Invalid amount provided to recordPayment.");
        }

        const clientId = await getClientId(email,customerName);
        if (!clientId) {
            throw new Error("Client ID is required but missing.");
        }

        const headers = await getFreshBooksHeaders();

        // Fetch the invoice ID
        const invoiceResponse = await axios.get(
            `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/invoices/invoices?client_id=${clientId}`,
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
            `https://api.freshbooks.com/accounting/account/${process.env.FRESHBOOKS_ACCOUNT_ID}/payments/payments`,
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



