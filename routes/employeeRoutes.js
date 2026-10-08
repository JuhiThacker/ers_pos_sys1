const express = require('express');

const {
    getEmployee,
    changePassword
} = require('../controller/employeeController.js');

const {
    authentication
} = require('../middleware/authentication.js');

const checkPermission = require('../middleware/permissionMiddleware');

const router = express.Router();

// CHANGE PASSWORD

router.patch(
    '/changePassword',
    authentication,
    checkPermission('employee.edit'),
    changePassword
);

// GET EMPLOYEE

router.get(
    '/:id',
    authentication,
    checkPermission('employee.view'),
    getEmployee
);


module.exports = router;