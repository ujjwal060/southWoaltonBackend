const express = require('express');
const { saveImageUrl ,getImageByUserId ,updateSign,getAllImages,sendRentalAgreementEmail } = require('../controllers/signController');
const multer = require('multer');

const router = express.Router();
const upload = require('../middleware/multer');

// Route to save image URL with user ID
router.post('/save', saveImageUrl); // 'image' is the key for the file input
router.put('/update-pdf', updateSign);
router.get('/get-pdf/:userId', getImageByUserId);
router.get('/get-sign', getAllImages);

//after signed agreement

router.post('/send', upload.single('pdf'), sendRentalAgreementEmail);

module.exports = router;
