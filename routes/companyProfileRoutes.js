const express = require('express');

const router = express.Router();

const {
    createCompany,
    getCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} = require('../controller/companyProfileController');

const {
    authentication
} = require('../middleware/authentication.js');

const checkPermission = require('../middleware/permissionMiddleware');


// CREATE COMPANY
router.post(
    '/',
    authentication,
    checkPermission('company.create'),
    createCompany
);


// GET ALL COMPANIES
router.get(
    '/',
    authentication,
    checkPermission('company.view'),
    getCompanies
);


// GET COMPANY BY ID
router.get(
    '/:id',
    authentication,
    checkPermission('company.view'),
    getCompanyById
);


// UPDATE COMPANY
router.put(
    '/:id',
    authentication,
    checkPermission('company.edit'),
    updateCompany
);


// DELETE COMPANY
router.delete(
    '/:id',
    authentication,
    checkPermission('company.delete'),
    deleteCompany
);


module.exports = router;