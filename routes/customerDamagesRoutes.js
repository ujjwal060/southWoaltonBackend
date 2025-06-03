const express = require('express');
const router = express.Router();
const customerDamagesController = require('../controllers/customerDamagesController');
const upload = require('../middleware/multer'); // Your multer.js file

router.post(
  '/create',
  upload.array('images', 10), // Allow up to 5 images
  customerDamagesController.createCustomerDamage
);

router.get('/', customerDamagesController.getAllCustomerDamage); 
router.get('/:id', customerDamagesController.getDamageById);
router.delete('/:id', customerDamagesController.deleteDamage);

module.exports = router;
