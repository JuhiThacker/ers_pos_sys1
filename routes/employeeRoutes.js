const express = require('express');

const {
    createEmployee,
    getAllEmployees,
    getProfileImage,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    changePassword,
    searchEmployees
} = require('../controller/employeeController.js');

const {
    handleImageUpload
} = require('../middleware/upload.js');

const {
    authentication
} = require('../middleware/authentication.js');

const checkPermission = require('../middleware/permissionMiddleware.js');

const router = express.Router();

// ========================================
// CREATE EMPLOYEE WITH PROFILE IMAGE
// POST /api/employees
// ========================================
router.post(
    '/',
    authentication,
    checkPermission('employee.create'),
    handleImageUpload,
    createEmployee
);

// ========================================
// SEARCH EMPLOYEES
// GET /api/employees/search
// ========================================
router.get(
    '/search',
    authentication,
    checkPermission('employee.view'),
    searchEmployees
);

// ========================================
// CHANGE PASSWORD
// PATCH /api/employees/changePassword
// ========================================
router.patch(
    '/changePassword',
    authentication,
    checkPermission('employee.edit'),
    changePassword
);

// ========================================
// GET PROFILE IMAGE
// GET /api/employees/:id/profile-image
// ========================================
router.get(
    '/:id/profile-image',
    authentication,
    checkPermission('employee.view'),
    getProfileImage
);

// ========================================
// GET ALL EMPLOYEES
// GET /api/employees
// ========================================
router.get(
    '/',
    authentication,
    checkPermission('employee.view'),
    getAllEmployees
);

// ========================================
// UPDATE EMPLOYEE
// PUT /api/employees/:id
// Supports updating profile image too
// ========================================
router.put(
    '/:id',
    authentication,
    checkPermission('employee.edit'),
    handleImageUpload,
    updateEmployee
);

// ========================================
// DELETE EMPLOYEE
// DELETE /api/employees/:id
// ========================================
router.delete(
    '/:id',
    authentication,
    checkPermission('employee.delete'),
    deleteEmployee
);

// ========================================
// GET EMPLOYEE BY ID
// GET /api/employees/:id
// Keep this route after specific routes.
// ========================================
router.get(
    '/:id',
    authentication,
    checkPermission('employee.view'),
    getEmployee
);

module.exports = router;