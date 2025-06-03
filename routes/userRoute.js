const express = require("express");
const path = require('path');
const User = require('../models/userModel');
const { getAllUsers, getUser,deleteUser,updateUser,register, updatePassword} = require('../controllers/userController')
const { verifyAdmin, verifyUser } = require('../middleware/verifyToken')
const upload = require('../middleware/multer');
// const company_route = express();
const router = express.Router();
router.get('/', verifyAdmin, getAllUsers);
router.get('/:id', verifyUser, getUser);
router.put('/:id', verifyAdmin,upload.single('image'), updateUser);
// router.put('updateimage/:id',upload.single('image'),updateImage);
router.delete('/:id', verifyAdmin, deleteUser);
router.post('/register', register);
router.put('/user/:id',updatePassword)
module.exports = router;