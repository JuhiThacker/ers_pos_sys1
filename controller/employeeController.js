const pool = require('../config/db');
const argon2 = require('argon2');


 // CREATE EMPLOYEE
const createEmployee = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            username,
            role_id,
            employee_number,
            password,
            email,
            contact_id,
            address,
            city,
            district,
            state,
            country,
            pincode,
            dob,
            joining_date
        } = req.body;

        // Validate required fields
        if (
            !first_name?.trim() ||
            !last_name?.trim() ||
            !username?.trim() ||
            !role_id ||
            !employee_number?.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, username, role, employee number, and password are required.'
            });
        }

        if (!Number.isInteger(Number(role_id)) || Number(role_id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'role_id must be a valid positive integer.'
            });
        }

        // Check for existing username or employee number
        const [existing] = await pool.execute(
            `SELECT id
             FROM employees
             WHERE username = ? OR employee_number = ?
             LIMIT 1`,
            [username.trim(), employee_number.trim()]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or employee number already exists.'
            });
        }

        // Check that the selected role exists
        const [roles] = await pool.execute(
            'SELECT id FROM roles WHERE id = ? LIMIT 1',
            [Number(role_id)]
        );

        if (roles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected role does not exist.'
            });
        }

        // Hash password before saving
        const hashedPassword = await argon2.hash(password);

        const [result] = await pool.execute(
            `INSERT INTO employees (
                first_name,
                last_name,
                username,
                role_id,
                employee_number,
                password,
                email,
                contact_id,
                address,
                city,
                district,
                state,
                country,
                pincode,
                dob,
                joining_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                first_name,
                last_name,
                username,
                Number(role_id),
                employee_number,
                hashedPassword,
                email?.trim() || null,
                contact_id || null,
                address || null,
                city || null,
                district || null,
                state || null,
                country || 'India',
                pincode || null,
                dob || null,
                joining_date || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Employee created successfully.',
            data: {
                id: result.insertId,
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                username: username.trim(),
                role_id: Number(role_id),
                employee_number: employee_number.trim(),
                email: email?.trim() || null
            }
        });

    } catch (error) {
        console.error('Create employee error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'A username, employee number, or other unique value already exists.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to create employee.'
        });
    }
};

// GET ALL EMPLOYEES
const getAllEmployees = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                e.id,
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
            LEFT JOIN roles r ON e.role_id = r.id
            LEFT JOIN contact c ON e.contact_id = c.id
            ORDER BY e.id DESC
        `);

        return res.status(200).json({
            success: true,
            message: 'Employees retrieved successfully.',
            count: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Get all employees error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve employees.'
        });
    }
};

// GET EMPLOYEE BY ID
const getEmployee = async (req, res) => {
    try {
        const employeeId = req.params.id;

        const [rows] = await pool.query(
            `SELECT
                e.id,
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
             WHERE e.id = ?`,
            [employeeId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found.'
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error('Get employee error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get employee.'
        });
    }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
    try {
        const employeeId = req.user?.employeeId ?? req.employee?.employeeId;
        const { oldPassword, newPassword } = req.body;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required.'
            });
        }

        const [rows] = await pool.query(
            'SELECT password FROM employees WHERE id = ?',
            [employeeId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found.'
            });
        }

        const isMatch = await argon2.verify(
            rows[0].password,
            oldPassword
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Old password is incorrect.'
            });
        }

        const hashedPassword = await argon2.hash(newPassword);

        await pool.query(
            'UPDATE employees SET password = ? WHERE id = ?',
            [hashedPassword, employeeId]
        );

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully.'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to change password.'
        });
    }
};

// SEARCH EMPLOYEES BY ID, EMAIL OR PHONE
const searchEmployees = async (req, res) => {
    try {
        const { id, email, phone } = req.query;

        if (!id && !email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Provide an employee ID, email, or phone number.'
            });
        }

        if ([id, email, phone].filter(Boolean).length > 1) {
            return res.status(400).json({
                success: false,
                message: 'Search using only one field at a time.'
            });
        }

        let sql = `
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.username,
                r.role_name,
                e.employee_number,
                e.email,
                c.phone,
                e.contact_id
            FROM employees e
            LEFT JOIN roles r ON e.role_id = r.id
            LEFT JOIN contact c ON e.contact_id = c.id
            WHERE
        `;

        const params = [];

        if (id) {
            if (!/^\d+$/.test(String(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID must be a number.'
                });
            }

            sql += 'e.id = ?';
            params.push(Number(id));

        } else if (email) {
            sql += 'LOWER(e.email) = LOWER(?)';
            params.push(email.trim());

        } else if (phone) {
            // Ignore spaces, +, hyphens and brackets in phone input.
            const normalizedPhone = phone.replace(/\D/g, '');

            if (!normalizedPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Enter a valid phone number.'
                });
            }

            sql += `
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(c.phone, ' ', ''),
                            '-', ''),
                        '+', ''),
                    '(', ''),
                ')', '') = ?
            `;
            params.push(normalizedPhone);
        }

        sql += ' ORDER BY e.id DESC LIMIT 50';

        const [rows] = await pool.execute(sql, params);

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Search employees error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to search employees.'
        });
    }
};

module.exports = {
    getAllEmployees,
    getEmployee,
    changePassword,
    searchEmployees,
    createEmployee
};