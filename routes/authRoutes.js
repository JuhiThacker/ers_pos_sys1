
const express = require('express');

const {
    login,
    me,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword
} = require('../controller/auth/authController.js');

const {
    authentication
} = require('../middleware/authentication.js');

const router = express.Router();

// LOGIN
router.post('/login', login);

// CURRENT EMPLOYEE
router.get('/me', authentication, me);

// LOGOUT
router.post('/logout', logout);

// FORGOT PASSWORD - Send OTP to email
router.post('/forgot-password', forgotPassword);

// VERIFY OTP
router.post('/verify-reset-otp', verifyResetOtp);

// RESET PASSWORD
router.post('/reset-password', resetPassword);

module.exports = router;
