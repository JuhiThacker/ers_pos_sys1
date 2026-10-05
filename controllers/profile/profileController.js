const pool = require('../../config/db');

const getProfile = async (req, res) => {
    try {
        const employeeId = req.user.employeeId;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Employee ID not found in token.'
            });
        }

        const [rows] = await pool.query(`
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.employee_code,
                e.email,
                e.address,
                e.city,
                e.district,
                e.state,
                e.country,
                e.pincode,
                e.dob,
                e.gender,
                e.joining_date,
                e.profile_image,
                r.role_name,
                c.phone
            FROM employees e
            LEFT JOIN roles r
                ON e.role_id = r.id
            LEFT JOIN contact c
                ON e.contact_id = c.id
            WHERE e.id = ?
        `, [employeeId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found.'
            });
        }

        return res.status(200).json({
            success: true,
            profile: rows[0]
        });

    } catch (error) {
        console.error('Get Profile Error:', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getProfile
};