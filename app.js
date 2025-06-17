const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { getConfig } = require('./config');
const { createPDF } = require('./functions/generatePdf');

dotenv.config();

require('./middleware/cronjob');

const roleRoute = require('./routes/roleRoute');
const authRoute = require('./routes/authRoute');
const userRoute = require('./routes/userRoute');
const signRoutes = require('./routes/signRoute');
const vehicleRoutes = require('./routes/vehicleRoute');
const contactRoutes = require('./routes/contactUsRoute');
const checkoutRoutes = require('./routes/checkoutRoute');
const paymentRoutes = require('./routes/paymentRoute');
const reserveRoutes = require('./routes/reserveRoute');
const customerDamagesRoutes = require('./routes/customerDamagesRoutes');
const requestRoutes = require('./routes/requestRoute');
const payRoutes = require('./routes/payRoute');

const app = express();

const corsOptions = {
  origin: '*',
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
};

async function initializeConfig() {
  try {
    const PORT = await getConfig('PORT');
    const MONGO_URL = await getConfig('MONGO_URL');

    app.use(bodyParser.json());
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    app.use('/api/role', roleRoute);
    app.use('/api/auth', authRoute);
    app.use('/api/user', userRoute);
    app.use('/api/sign', signRoutes);
    app.use('/api/vehicle', vehicleRoutes);
    app.use('/api/book', checkoutRoutes);
    app.use('/api/create', contactRoutes);
    app.use('/api/reserve', reserveRoutes);
    app.use('/api/request', requestRoutes);
    app.use('/api/customer-damages', customerDamagesRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/pay', payRoutes);

    app.post('/generate-pdf', async (req, res) => {
      try {
        const { userId } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required to generate PDF' });
        }

        const pdfData = await createPDF(userId);
        const fileName = `User_${userId}_Report.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfData.pdfBuffer);
      } catch (error) {
        console.error('Error generating PDF:', error.message);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
      }
    });

    app.use((obj, req, res, next) => {
      const statusCode = obj.status || 500;
      const message = obj.message || 'Something went wrong!';
      return res.status(statusCode).json({
        success: [200, 201, 204].includes(obj.status),
        status: statusCode,
        message,
        data: obj.data,
      });
    });

    mongoose.set('strictQuery', false);
    mongoose
      .connect(MONGO_URL)
      .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
          console.log(`🚀 Server running on port ${PORT}`);
        });
      })
      .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
      });
  } catch (err) {
    console.error('❌ Failed to initialize configuration:', err.message);
    process.exit(1);
  }
}

initializeConfig();
