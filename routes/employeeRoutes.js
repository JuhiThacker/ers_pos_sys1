const express = require('express');

const {
    getEmployee,
    changePassword
} = require('../controller/employeeController.js');

const {
    getProfile
} = require('../controller/profile/profileController.js');

const {
    authentication
} = require('../middleware/authentication.js');

const router = express.Router();


// ==========================================
// PROFILE
// ==========================================

router.get(
    '/profile',
    authentication,
    getProfile
);


// ==========================================
// CHANGE PASSWORD
// ==========================================

router.patch(
    '/changePassword',
    authentication,
    changePassword
);


// ==========================================
// GET EMPLOYEE BY ID
// ==========================================

router.get(
    '/:id',
    authentication,
    getEmployee
);


module.exports = router;