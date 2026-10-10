
const express = require('express');

const {
    getEmployee,
    changePassword,
    searchEmployees
} = require('../controller/employeeController.js');

const {
    authentication
} = require('../middleware/authentication.js');

const checkPermission = require('../middleware/permissionMiddleware');

const router = express.Router();

// SEARCH EMPLOYEES BY ID, EMAIL OR PHONE
router.get(
    '/search',
    authentication,
    checkPermission('employee.view'),
    searchEmployees
);

// CHANGE PASSWORD
router.patch(
    '/changePassword',
    authentication,
    checkPermission('employee.edit'),
    changePassword
);

// GET EMPLOYEE BY ID
router.get(
    '/:id',
    authentication,
    checkPermission('employee.view'),
    getEmployee
);

module.exports = router;
