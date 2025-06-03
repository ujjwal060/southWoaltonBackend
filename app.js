// require('dotenv').config();
require('dotenv').config()
const express = require('express') 
const path = require('path');
const mongoose = require('mongoose')
// const companyLoginRoutes = require('./routes/companyLoginRoutes')
const roleRoute = require('./routes/roleRoute')
const authRoute = require('./routes/authRoute')
const userRoute = require('./routes/userRoute')
const signRoutes = require('./routes/signRoute');
const vehicleRoutes = require('./routes/vehicleRoute');
const contactRoutes = require('./routes/contactUsRoute');
const checkoutRoutes= require('./routes/checkoutRoute')
const payment = require('./routes/paymentRoute');
const Reserv= require('./routes/reserveRoute')
const customerDamagesRoutes = require('./routes/customerDamagesRoutes');
const requestRoute = require('./routes/requestRoute')
const pay=require('./routes/payRoute');
const  { createPDF} =require ('./functions/generatePdf')


//

const bodyParser = require('body-parser')
// const itemInventoryRoute = require('./routes/itemInventoryRoute')
// const errorMiddleware = require('./middleware/errorMiddleware')
const PORT = process.env.PORT || 5000
const MONGO_URL = process.env.MONGO_URL
const FRONTEND = process.env.FRONTEND
const cookieParser = require('cookie-parser')
var cors = require('cors')
var app = express();
var corsOptions = {
    origin: "*",
    methods:"GET,POST, PUT, DELETE",
    // some legacy browsers (IE11, various SmartTVs) choke on 204
    Credentials: true
}
app.use(bodyParser.json());
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
// app.use('/api/login', companyLoginRoutes)
//to create roles
app.use('/api/role', roleRoute)
//to register and login
app.use('/api/auth', authRoute)
//to list users
app.use('/api/user', userRoute)

app.use('/api/sign', signRoutes);

app.use('/api/vehicle', vehicleRoutes);

// to create bookingForm

app.use('/api/book',checkoutRoutes);

// to create contactForm
app.use('/api/create',contactRoutes);

// Reserve

app.use('/api/reserve',Reserv);

app.use('/api/request',requestRoute);
app.use('/api/customer-damages', customerDamagesRoutes);
//payment creation

app.use('/api/payment',payment);
app.use('/api/pay',pay);
//generate pdf 
app.post('/generate-pdf', async (req, res) => {
    try {
        // Extract the userId from the request body, query, or params
        const { userId } = req.body; // Assuming `userId` is sent in the request body
        console.log("Received userId:", userId);

        // Validate the userId
        if (!userId) {
            return res.status(400).json({ error: "User ID is required to generate PDF" });
        }

        // Create PDF with the provided userId
        const pdfData = await createPDF(userId);

        const fileName = `User_${userId}_Report.pdf`;

        // Set headers and send the generated PDF as a response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`); // Use Content-Disposition to suggest filename

        // Send the generated PDF file
        res.send(pdfData.pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error.message);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((obj, req, res, next) => {
    const statusCode = obj.status || 500;
    const message = obj.message || "Something went wrong!";
    return res.status(statusCode).json({
        success: [200, 201, 204].some(a => a === obj.status) ? true : false,
        status: statusCode,
        message: message,
        data: obj.data
    })
})
// app.use(errorMiddleware);

//database connect

mongoose.set("strictQuery", false)
mongoose.
    connect(MONGO_URL)
    .then(() => {
        console.log('connected to MongoDB')
        app.listen(PORT, () => {
            console.log(`Node API app is running on port ${PORT}`)
        });
    }).catch((error) => {
        console.log(error)
    })
