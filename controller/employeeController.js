
const pool = require('../config/db');
const argon2 = require('argon2');

// ========================================
// CREATE EMPLOYEE
// ========================================
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
            typeof first_name !== 'string' || !first_name.trim() ||
            typeof last_name !== 'string' || !last_name.trim() ||
            typeof username !== 'string' || !username.trim() ||
            !role_id ||
            typeof employee_number !== 'string' ||
            !employee_number.trim() ||
            typeof password !== 'string' ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, username, role, employee number, and password are required.'
            });
        }

        const roleId = Number(role_id);

        if (!Number.isSafeInteger(roleId) || roleId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'role_id must be a valid positive integer.'
            });
        }

        const firstName = first_name.trim();
        const lastName = last_name.trim();
        const employeeUsername = username.trim();
        const employeeNumber = employee_number.trim();

        // Check for existing username or employee number
        const [existing] = await pool.execute(
            `SELECT id
             FROM employees
             WHERE username = ? OR employee_number = ?
             LIMIT 1`,
            [employeeUsername, employeeNumber]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or employee number already exists.'
            });
        }

        // Verify role
        const [roles] = await pool.execute(
            'SELECT id FROM roles WHERE id = ? LIMIT 1',
            [roleId]
        );

        if (roles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected role does not exist.'
            });
        }

        // Hash password
        const hashedPassword = await argon2.hash(password);

        // Insert employee
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
                firstName,
                lastName,
                employeeUsername,
                roleId,
                employeeNumber,
                hashedPassword,
                email?.trim() || null,
                contact_id || null,
                address?.trim() || null,
                city?.trim() || null,
                district?.trim() || null,
                state?.trim() || null,
                country?.trim() || 'India',
                pincode?.trim() || null,
                dob || null,
                joining_date || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Employee created successfully.',
            data: {
                id: result.insertId,
                first_name: firstName,
                last_name: lastName,
                username: employeeUsername,
                role_id: roleId,
                employee_number: employeeNumber,
                email: email?.trim() || null
            }
        });

    } catch (error) {
        // Full error appears in the VS Code terminal
        console.error('Create employee error:', error);
        console.error('Database error code:', error.code);
        console.error('Database error message:', error.sqlMessage);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username, employee number, or another unique value already exists.'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'A referenced role or contact record does not exist.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to create employee.',
            ...(process.env.NODE_ENV === 'development'
                ? { debug: error.message, code: error.code }
                : {})
        });
    }
};


/**
 * UPDATE EMPLOYEE
 * PUT /api/employees/:id
 */
const updateEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);

        if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID.'
            });
        }

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

        // Confirm employee exists
        const [employees] = await pool.execute(
            'SELECT id FROM employees WHERE id = ? LIMIT 1',
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found.'
            });
        }

        // Only update fields supplied by the client
        const fields = [];
        const values = [];

        const addField = (column, value) => {
            fields.push(`${column} = ?`);
            values.push(value);
        };

        // Validate and add text fields
        const textFields = {
            first_name,
            last_name,
            username,
            employee_number,
            email,
            address,
            city,
            district,
            state,
            country,
            pincode
        };

        for (const [field, value] of Object.entries(textFields)) {
            if (value !== undefined) {
                if (value !== null && typeof value !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be a string or null.`
                    });
                }

                if (
                    ['first_name', 'last_name', 'username', 'employee_number']
                        .includes(field) &&
                    (value === null || !value.trim())
                ) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} cannot be empty.`
                    });
                }

                const normalizedValue =
                    typeof value === 'string' ? value.trim() : null;

                addField(field, normalizedValue);
            }
        }

        // Validate role if supplied
        if (role_id !== undefined) {
            const roleId = Number(role_id);

            if (!Number.isSafeInteger(roleId) || roleId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'role_id must be a positive integer.'
                });
            }

            const [roles] = await pool.execute(
                'SELECT id FROM roles WHERE id = ? LIMIT 1',
                [roleId]
            );

            if (roles.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected role does not exist.'
                });
            }

            addField('role_id', roleId);
        }

        // Validate contact if supplied
        if (contact_id !== undefined) {
            if (contact_id === null || contact_id === '') {
                addField('contact_id', null);
            } else {
                const contactId = Number(contact_id);

                if (!Number.isSafeInteger(contactId) || contactId <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'contact_id must be a positive integer or null.'
                    });
                }

                // Confirm contact exists
                const [contacts] = await pool.execute(
                    'SELECT id FROM contact WHERE id = ? LIMIT 1',
                    [contactId]
                );

                if (contacts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected contact does not exist.'
                    });
                }

                addField('contact_id', contactId);
            }
        }

        // Validate dates when supplied
        for (const field of ['dob', 'joining_date']) {
            const value = req.body[field];

            if (value !== undefined) {
                if (
                    value !== null &&
                    value !== '' &&
                    (
                        typeof value !== 'string' ||
                        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                        !Number.isFinite(Date.parse(value)) ||
                        new Date(value).toISOString().slice(0, 10) !== value
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must use YYYY-MM-DD format or null.`
                    });
                }

                addField(field, value || null);
            }
        }

        // Change password only if provided
        if (password !== undefined) {
            if (typeof password !== 'string' || password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must contain at least 8 characters.'
                });
            }

            const hashedPassword = await argon2.hash(password);
            addField('password', hashedPassword);
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least one field to update.'
            });
        }

        // Check for duplicate username or employee number
        if (username !== undefined || employee_number !== undefined) {
            const newUsername =
                username === undefined ? null : username.trim();

            const newEmployeeNumber =
                employee_number === undefined
                    ? null
                    : employee_number.trim();

            const [duplicates] = await pool.execute(
                `SELECT id
                 FROM employees
                 WHERE id <> ?
                   AND (
                       (? IS NOT NULL AND username = ?)
                       OR
                       (? IS NOT NULL AND employee_number = ?)
                   )
                 LIMIT 1`,
                [
                    employeeId,
                    newUsername,
                    newUsername,
                    newEmployeeNumber,
                    newEmployeeNumber
                ]
            );

            if (duplicates.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Username or employee number already belongs to another employee.'
                });
            }
        }

        // Perform update
        values.push(employeeId);

        await pool.execute(
            `UPDATE employees
             SET ${fields.join(', ')}
             WHERE id = ?`,
            values
        );

        return res.status(200).json({
            success: true,
            message: 'Employee updated successfully.',
            employee_id: employeeId
        });

    } catch (error) {
        console.error('Update employee error:', error);
        console.error('Database error code:', error.code);
        console.error('Database error message:', error.sqlMessage);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username, employee number, or another unique value already exists.'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'A referenced role or contact record does not exist.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to update employee.',
            ...(process.env.NODE_ENV === 'development'
                ? { debug: error.message, code: error.code }
                : {})
        });
    }
};


// ========================================
// GET ALL EMPLOYEES
// ========================================
const getAllEmployees = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.username,
                r.role_name,
                e.role_id,
                e.employee_number,
                e.email,
                c.phone,
                e.contact_id,
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


// ========================================
// GET EMPLOYEE BY ID
// ========================================
const getEmployee = async (req, res) => {
    try {
        const employeeId = req.params.id;

        if (!/^\d+$/.test(String(employeeId))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID.'
            });
        }

        const [rows] = await pool.execute(
            `SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.username,
                e.role_id,
                r.role_name,
                e.employee_number,
                e.email,
                c.phone,
                e.contact_id,
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
             WHERE e.id = ?`,
            [Number(employeeId)]
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


// ========================================
// CHANGE PASSWORD
// ========================================
const changePassword = async (req, res) => {
    try {
        const employeeId =
            req.user?.employeeId ??
            req.user?.id ??
            req.employee?.employeeId;

        const { oldPassword, newPassword } = req.body;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (
            typeof oldPassword !== 'string' ||
            typeof newPassword !== 'string' ||
            !oldPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must contain at least 8 characters.'
            });
        }

        const [rows] = await pool.execute(
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

        await pool.execute(
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

/**
 * DELETE EMPLOYEE
 * DELETE /api/employees/:id
 */
const deleteEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);

        // Validate employee ID
        if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID.'
            });
        }

        // Check whether employee exists
        const [employees] = await pool.execute(
            `SELECT id, first_name, last_name, employee_number
             FROM employees
             WHERE id = ?
             LIMIT 1`,
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found.'
            });
        }

        // Permanently delete employee
        const [result] = await pool.execute(
            'DELETE FROM employees WHERE id = ?',
            [employeeId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee was not deleted.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Employee deleted successfully.',
            data: {
                id: employees[0].id,
                employee_number: employees[0].employee_number
            }
        });

    } catch (error) {
        console.error('Delete employee error:', error);
        console.error('Database error code:', error.code);
        console.error('Database error message:', error.sqlMessage);

        // Employee may be referenced by attendance, sales,
        // audit logs, or other tables.
        if (
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.code === 'ER_ROW_IS_REFERENCED'
        ) {
            return res.status(409).json({
                success: false,
                message:
                    'This employee is referenced by other records. Deletion is blocked to preserve related data.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to delete employee.',
            ...(process.env.NODE_ENV === 'development'
                ? { debug: error.message, code: error.code }
                : {})
        });
    }
};


// ========================================
// SEARCH EMPLOYEES BY ID, EMAIL OR PHONE
// ========================================
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
                e.role_id,
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
                                REPLACE(COALESCE(c.phone, ''), ' ', ''),
                                '-', ''),
                            '+', ''),
                        '(', ''),
                    ')', ''
                ) = ?
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


// ========================================
// EXPORT CONTROLLERS
// ========================================
module.exports = {
    createEmployee,
    getAllEmployees,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    changePassword,
    searchEmployees
};
