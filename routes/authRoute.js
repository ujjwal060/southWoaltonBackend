const express = require('express');
const {signUp,login,registerAdmin,sendEmail,resetPassword, updateUser, verifyOTP,redirectToFreshBooks,connectFreshBooks} = require('../controllers/authController')

//as User
const   router = express.Router();
router.post('/signUp', signUp); // login 

router.post('/login', login);


//as Admin
router.post('/register-admin', registerAdmin);


//send reset email

router.post('/send-email',sendEmail)

//Reset Password
router.post("/resetPassword", resetPassword);

//verify OTP
router.post("/verify-otp", verifyOTP);

router.get('/freshbookAuth', redirectToFreshBooks);
router.get('/callback', connectFreshBooks);

module.exports = router;