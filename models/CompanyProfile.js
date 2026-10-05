const db = require('../config/db');

const CompanyProfile = {

    // ==========================================
    // CREATE COMPANY
    // ==========================================
    create: async (companyData) => {

        const sql = `
            INSERT INTO company_profile (
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
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `;

        const values = [
            companyData.company_code,
            companyData.company_name,
            companyData.legal_name,
            companyData.short_name,
            companyData.business_type,
            companyData.business_category,
            companyData.gst_registration_type,
            companyData.gst_number,
            companyData.pan_number,
            companyData.cin_number,
            companyData.state_code,
            companyData.email,
            companyData.phone,
            companyData.contact_person,
            companyData.website,
            companyData.logo,
            companyData.address,
            companyData.city,
            companyData.district,
            companyData.state,
            companyData.country,
            companyData.pincode,
            companyData.financial_year_start,
            companyData.financial_year_end,
            companyData.timezone,
            companyData.currency_code,
            companyData.currency_symbol,
            companyData.office_start_time,
            companyData.office_end_time,
            companyData.status,
            companyData.created_by
        ];

        const [result] = await db.execute(sql, values);

        return result;
    },


    // ==========================================
    // GET ALL COMPANIES
    // ==========================================
    getAll: async () => {

        const [rows] = await db.execute(`
            SELECT *
            FROM company_profile
            ORDER BY id DESC
        `);

        return rows;
    },


    // ==========================================
    // GET COMPANY BY ID
    // ==========================================
    getById: async (id) => {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM company_profile
            WHERE id = ?
            `,
            [id]
        );

        return rows[0];
    },


    // ==========================================
    // UPDATE COMPANY
    // ==========================================
    update: async (id, companyData) => {

        const sql = `
            UPDATE company_profile
            SET
                company_code = ?,
                company_name = ?,
                legal_name = ?,
                short_name = ?,
                business_type = ?,
                business_category = ?,
                gst_registration_type = ?,
                gst_number = ?,
                pan_number = ?,
                cin_number = ?,
                state_code = ?,
                email = ?,
                phone = ?,
                contact_person = ?,
                website = ?,
                logo = ?,
                address = ?,
                city = ?,
                district = ?,
                state = ?,
                country = ?,
                pincode = ?,
                financial_year_start = ?,
                financial_year_end = ?,
                timezone = ?,
                currency_code = ?,
                currency_symbol = ?,
                office_start_time = ?,
                office_end_time = ?,
                status = ?
            WHERE id = ?
        `;

        const values = [
            companyData.company_code,
            companyData.company_name,
            companyData.legal_name,
            companyData.short_name,
            companyData.business_type,
            companyData.business_category,
            companyData.gst_registration_type,
            companyData.gst_number,
            companyData.pan_number,
            companyData.cin_number,
            companyData.state_code,
            companyData.email,
            companyData.phone,
            companyData.contact_person,
            companyData.website,
            companyData.logo,
            companyData.address,
            companyData.city,
            companyData.district,
            companyData.state,
            companyData.country,
            companyData.pincode,
            companyData.financial_year_start,
            companyData.financial_year_end,
            companyData.timezone,
            companyData.currency_code,
            companyData.currency_symbol,
            companyData.office_start_time,
            companyData.office_end_time,
            companyData.status,
            id
        ];

        const [result] = await db.execute(sql, values);

        return result;
    },


    // ==========================================
    // DELETE COMPANY
    // ==========================================
    delete: async (id) => {

        const [result] = await db.execute(
            `
            DELETE FROM company_profile
            WHERE id = ?
            `,
            [id]
        );

        return result;
    }
};

module.exports = CompanyProfile;