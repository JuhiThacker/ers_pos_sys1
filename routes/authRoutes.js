const express = require('express');

const {
    login,
    me,
    logout
} = require('../controllers/auth/authController.js');

const {
    authentication
} = require('../middleware/authentication.js');

const router = express.Router();


// ==================================================
// LOGIN
// ==================================================

router.post(
    '/login',
    login
);


// ==================================================
// CURRENT EMPLOYEE
// ==================================================

router.get(
    '/me',
    authentication,
    me
);


// ==================================================
// LOGOUT
// ==================================================

router.post(
    '/logout',
    logout
);


module.exports = router;