const authRoutes=require('../routes/authRoutes.js');
const employeeRoutes= require('../routes/employeeRoutes.js');
const express = require('express');

const router = express.Router();

router.use('/auth',authRoutes);
router.use('/employees',employeeRoutes);

module.exports=router;