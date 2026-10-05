const express = require('express');

const router = express.Router();

const {
    createCompany,
    getCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} = require('../controller/companyProfileController');


router.post('/', createCompany);

router.get('/', getCompanies);

router.get('/:id', getCompanyById);

router.put('/:id', updateCompany);

router.delete('/:id', deleteCompany);


module.exports = router;