const express = require("express");
const Role = require('../models/roleModel');
const {createRole,updateRole,getRoles,deleteRole} = require('../controllers/roleController')
const { verifyAdmin, verifyUser } = require('../middleware/verifyToken')
// const company_route = express();
const router = express.Router();
router.post('/create',verifyAdmin, createRole);
router.put('/update/:id',verifyAdmin, updateRole);
router.get('/getAll', getRoles);
router.delete('/delete/:id', deleteRole);
module.exports = router;