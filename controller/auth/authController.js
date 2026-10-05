const {
    authValidator
} = require('../../validator/authValidator.js');

const pool = require('../../config/db.js');

const argon2 = require('argon2');

const jwt = require('jsonwebtoken');


// ==================================================
// LOGIN
// ==================================================

const login = async (req, res) => {

    try {

        // ------------------------------------------------
        // Validate Request
        // ------------------------------------------------

        const validation =
            authValidator.safeParse(req.body);

        if (!validation.success) {

            const errorMessages =
                validation.error.issues.map(
                    (err) => err.message
                );

            return res.status(400).json({
                success: false,
                error: errorMessages
            });
        }


        // ------------------------------------------------
        // Get Login Data
        // ------------------------------------------------

        const {
            username,
            password
        } = validation.data;


        // ------------------------------------------------
        // Find Employee By Username
        // ------------------------------------------------

        const [rows] = await pool.query(
            `
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.employee_code,
                e.username,
                e.password,
                e.email,
                e.role_id,
                r.role_name

            FROM employees e

            LEFT JOIN roles r
                ON r.id = e.role_id

            WHERE e.username = ?

            LIMIT 1
            `,
            [username]
        );


        // ------------------------------------------------
        // Employee Not Found
        // ------------------------------------------------

        if (rows.length === 0) {

            return res.status(401).json({
                success: false,
                error: 'Invalid username or password.'
            });
        }


        const employee = rows[0];


        // ------------------------------------------------
        // Verify Password
        // ------------------------------------------------

        const isMatch =
            await argon2.verify(
                employee.password,
                password
            );


        if (!isMatch) {

            return res.status(401).json({
                success: false,
                error: 'Invalid username or password.'
            });
        }


        // ------------------------------------------------
        // Check JWT Secret
        // ------------------------------------------------

        if (!process.env.JWT_SECRET) {

            console.error(
                'JWT_SECRET is missing.'
            );

            return res.status(500).json({
                success: false,
                error: 'JWT secret is not configured.'
            });
        }


        // ------------------------------------------------
        // Create JWT
        // ------------------------------------------------

        const token = jwt.sign(

            {
                employeeId: employee.id,

                roleId: employee.role_id,

                employeeCode:
                    employee.employee_code,

                username:
                    employee.username
            },

            process.env.JWT_SECRET,

            {
                expiresIn:
                    process.env.JWT_EXPIRES_IN || '1d'
            }
        );


        // ------------------------------------------------
        // Store Token In Cookie
        // ------------------------------------------------

        res.cookie(
            'token',
            token,
            {
                httpOnly: true,

                secure:
                    process.env.NODE_ENV === 'production',

                sameSite:
                    process.env.NODE_ENV === 'production'
                        ? 'none'
                        : 'lax',

                maxAge:
                    24 * 60 * 60 * 1000
            }
        );


        // ------------------------------------------------
        // Login Response
        // ------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                'Login successfully. Welcome, ' +
                employee.first_name +
                ' ' +
                employee.last_name +
                '!',

            token,

            employee: {

                id:
                    employee.id,

                first_name:
                    employee.first_name,

                last_name:
                    employee.last_name,

                employee_code:
                    employee.employee_code,

                username:
                    employee.username,

                email:
                    employee.email,

                role_id:
                    employee.role_id,

                role_name:
                    employee.role_name
            }
        });

    } catch (error) {

        console.error(
            '========== LOGIN ERROR =========='
        );

        console.error(
            'Message:',
            error.message
        );

        console.error(
            'Stack:',
            error.stack
        );

        console.error(
            '================================='
        );

        return res.status(500).json({

            success: false,

            error:
                error.message
        });
    }
};


// ==================================================
// CURRENT EMPLOYEE
// ==================================================

const me = async (req, res) => {

    try {

        const employeeId =
            req.user.employeeId;


        // ------------------------------------------------
        // Check Employee ID
        // ------------------------------------------------

        if (!employeeId) {

            return res.status(401).json({

                success: false,

                error:
                    'Employee ID not found in token.'
            });
        }


        // ------------------------------------------------
        // Get Employee
        // ------------------------------------------------

        const [rows] = await pool.query(
            `
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.employee_code,
                e.username,
                e.email,
                e.role_id,
                r.role_name,
                e.profile_image

            FROM employees e

            LEFT JOIN roles r
                ON r.id = e.role_id

            WHERE e.id = ?

            LIMIT 1
            `,
            [employeeId]
        );


        // ------------------------------------------------
        // Employee Not Found
        // ------------------------------------------------

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                error:
                    'Employee not found.'
            });
        }


        // ------------------------------------------------
        // Response
        // ------------------------------------------------

        return res.status(200).json({

            success: true,

            employee: rows[0]

        });

    } catch (error) {

        console.error(
            '========== ME ERROR =========='
        );

        console.error(
            'Message:',
            error.message
        );

        console.error(
            'Stack:',
            error.stack
        );

        console.error(
            '=============================='
        );

        return res.status(500).json({

            success: false,

            error:
                'Something went wrong.'
        });
    }
};


// ==================================================
// LOGOUT
// ==================================================

const logout = async (req, res) => {

    try {

        res.clearCookie(
            'token',
            {
                httpOnly: true,

                secure:
                    process.env.NODE_ENV === 'production',

                sameSite:
                    process.env.NODE_ENV === 'production'
                        ? 'none'
                        : 'lax'
            }
        );


        return res.status(200).json({

            success: true,

            message:
                'Logout successfully.'
        });

    } catch (error) {

        console.error(
            '========== LOGOUT ERROR =========='
        );

        console.error(
            'Message:',
            error.message
        );

        console.error(
            'Stack:',
            error.stack
        );

        console.error(
            '=================================='
        );

        return res.status(500).json({

            success: false,

            error:
                'Something went wrong.'
        });
    }
};


// ==================================================
// EXPORT
// ==================================================

module.exports = {

    login,

    me,

    logout

};