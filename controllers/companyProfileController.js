const CompanyProfile = require('../models/CompanyProfile');


// ==========================================
// CREATE COMPANY
// ==========================================
exports.createCompany = async (req, res) => {

    try {

        const {
            company_code,
            company_name,
            legal_name,
            short_name,
            business_type,
            business_category,
            gst_registration_type,
            gst_number,
            pan_number,
            cin_number,
            state_code,
            email,
            phone,
            contact_person,
            website,
            logo,
            address,
            city,
            district,
            state,
            country,
            pincode,
            financial_year_start,
            financial_year_end,
            timezone,
            currency_code,
            currency_symbol,
            office_start_time,
            office_end_time,
            status,
            created_by
        } = req.body;


        // Required fields
        if (!company_code || !company_name || !created_by) {

            return res.status(400).json({
                success: false,
                message: 'company_code, company_name and created_by are required'
            });
        }


        // Check duplicate company code
        const existingCompanies = await CompanyProfile.getAll();

        const existingCompany = existingCompanies.find(
            company => company.company_code === company_code
        );

        if (existingCompany) {

            return res.status(409).json({
                success: false,
                message: 'Company code already exists'
            });
        }


        const result = await CompanyProfile.create({
            company_code,
            company_name,
            legal_name,
            short_name,
            business_type,
            business_category,
            gst_registration_type,
            gst_number,
            pan_number,
            cin_number,
            state_code,
            email,
            phone,
            contact_person,
            website,
            logo,
            address,
            city,
            district,
            state,
            country,
            pincode,
            financial_year_start,
            financial_year_end,
            timezone,
            currency_code,
            currency_symbol,
            office_start_time,
            office_end_time,
            status,
            created_by
        });


        const company = await CompanyProfile.getById(
            result.insertId
        );


        return res.status(201).json({
            success: true,
            message: 'Company profile created successfully',
            data: company
        });

    } catch (error) {

        console.error('Create company error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create company profile',
            error: error.message
        });
    }
};


// ==========================================
// GET ALL COMPANIES
// ==========================================
exports.getCompanies = async (req, res) => {

    try {

        const companies = await CompanyProfile.getAll();

        return res.status(200).json({
            success: true,
            count: companies.length,
            data: companies
        });

    } catch (error) {

        console.error('Get companies error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch companies',
            error: error.message
        });
    }
};


// ==========================================
// GET COMPANY BY ID
// ==========================================
exports.getCompanyById = async (req, res) => {

    try {

        const { id } = req.params;

        const company = await CompanyProfile.getById(id);

        if (!company) {

            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }


        return res.status(200).json({
            success: true,
            data: company
        });

    } catch (error) {

        console.error('Get company error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch company',
            error: error.message
        });
    }
};


// ==========================================
// UPDATE COMPANY
// ==========================================
exports.updateCompany = async (req, res) => {

    try {

        const { id } = req.params;

        const existingCompany = await CompanyProfile.getById(id);

        if (!existingCompany) {

            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }


        await CompanyProfile.update(id, req.body);

        const updatedCompany = await CompanyProfile.getById(id);


        return res.status(200).json({
            success: true,
            message: 'Company profile updated successfully',
            data: updatedCompany
        });

    } catch (error) {

        console.error('Update company error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update company',
            error: error.message
        });
    }
};


// ==========================================
// DELETE COMPANY
// ==========================================
exports.deleteCompany = async (req, res) => {

    try {

        const { id } = req.params;

        const existingCompany = await CompanyProfile.getById(id);

        if (!existingCompany) {

            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }


        await CompanyProfile.delete(id);


        return res.status(200).json({
            success: true,
            message: 'Company profile deleted successfully'
        });

    } catch (error) {

        console.error('Delete company error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to delete company',
            error: error.message
        });
    }
};