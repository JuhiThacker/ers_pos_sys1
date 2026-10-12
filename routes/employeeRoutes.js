
const express = require('express');

const {
    getAllEmployees,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    changePassword,
    searchEmployees,
    createEmployee
} = require('../controller/employeeController.js');

const { authentication } = require('../middleware/authentication.js');
const checkPermission = require('../middleware/permissionMiddleware.js');

const router = express.Router();

// CREATE EMPLOYEE
router.post(
    '/',
    authentication,
    checkPermission('employee.create'),
    createEmployee
);

// Update employee
router.put(
    '/:id',
    authentication,
    checkPermission('employee.edit'),
    updateEmployee
);
//Delete Employee
router.delete(
    '/:id',
    authentication,
    checkPermission('employee.delete'),
    deleteEmployee
);

// GET ALL EMPLOYEES
router.get(
    '/',
    authentication,
    checkPermission('employee.view'),
    getAllEmployees
);

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
