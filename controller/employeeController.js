const pool = require('../config/db');
const argon2 = require('argon2');


// ==========================================
// GET EMPLOYEE
// ==========================================

const getEmployee = async (req, res) => {
    try {

        const employeeId = req.params.id;

        const [rows] = await pool.query(
            `
            SELECT
                e.first_name,
                e.last_name,
                e.username,
                r.role_name,
                e.employee_number,
                e.email,
                c.phone,
                e.address,
                e.city,
                e.district,
                e.state,
                e.country,
                e.pincode,
                e.dob,
                e.joining_date
            FROM employees e
            INNER JOIN roles r
                ON e.role_id = r.id
            INNER JOIN contact c
                ON e.contact_id = c.id
            WHERE e.id = ?
            `,
            [employeeId]
        );

        return res.status(200).json({
            success: true,
            profile: rows
        });

    } catch (error) {

        console.error('Get Employee Error:', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// ==========================================
// CHANGE PASSWORD
// ==========================================

const changePassword = async (req, res) => {

    try {

        const employeeId = req.user.employeeId;

        const {
            oldPassword,
            newPassword
        } = req.body;


        if (!oldPassword || !newPassword) {

            return res.status(400).json({
                success: false,
                error:
                    'Old password and new password are required.'
            });
        }


        // Get current password hash
        const [rows] = await pool.query(
            `
            SELECT password
            FROM employees
            WHERE id = ?
            `,
            [employeeId]
        );


        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: 'Employee not found.'
            });
        }


        // Verify old password
        const isMatch = await argon2.verify(
            rows[0].password,
            oldPassword
        );


        if (!isMatch) {

            return res.status(400).json({
                success: false,
                error:
                    'Old password is incorrect.'
            });
        }


        // Hash new password
        const hashedPassword =
            await argon2.hash(newPassword);


        // Update password
        await pool.query(
            `
            UPDATE employees
            SET password = ?
            WHERE id = ?
            `,
            [
                hashedPassword,
                employeeId
            ]
        );


        return res.status(200).json({
            success: true,
            message:
                'Password changed successfully.'
        });


    } catch (error) {

        console.error(
            'Change Password Error:',
            error
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    getEmployee,
    changePassword
};