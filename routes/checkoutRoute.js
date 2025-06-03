const express = require('express');
const upload = require('../middleware/multer'); // Import your multer setup
const { createBooking,bookingHistoryByUserId } = require('../controllers/checkoutController'); // Import the controller

const router = express.Router();

router.post('/create',upload.fields([
    { name: 'dpolicy', maxCount: 1 },
    { name: 'dlicense', maxCount: 1 },
]), createBooking);
router.get('/history/:userId', bookingHistoryByUserId);

module.exports = router;
