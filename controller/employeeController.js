const pool = require('../config/db');
const argon2 = require('argon2');


//getEmployee
const getEmployee = async (req, res) => {
    try {
        const employeeId = req.params.id;
        const [rows] = await pool.query(`SELECT
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
            INNER JOIN roles r ON e.role_id = r.id
            INNER JOIN contact c ON e.contact_id = c.id
            WHERE e.id=?`, [employeeId]);
        return res.status(200).json({ rows });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

//Change password
const changePassword = async (req, res) => {
    try {

        const employeeId = req.employee.employeeId;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old password and new password are required.' });
        }
        const [rows] = await pool.query(`SELECT password FROM employees WHERE id=?`, [employeeId]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Employee not found.' });
        }

        const isMatch = await argon2.verify(rows[0].password,oldPassword);

        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect.' });
        }

        const hashedPassword = await argon2.hash(newPassword);

        await pool.query(`UPDATE employees SET password=? WHERE id=?`, [hashedPassword, employeeId]);

        return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

};
module.exports = { getEmployee, changePassword };