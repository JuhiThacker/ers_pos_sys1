const { authValidator } = require("../../validator/authValidator.js");
const pool = require("../../config/db.js");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

// ========================================
// LOGIN
// ========================================
const login = async (req, res) => {
    try {
        // 1. Validate request
        const validation = authValidator.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: validation.error.issues.map(
                    (issue) => issue.message
                ),
            });
        }

        const { username, password } = validation.data;

        // 2. Find employee
        const [rows] = await pool.query(
            `SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.employee_number,
                e.username,
                e.password,
                e.email,
                e.role_id,
                r.role_name
             FROM employees e
             LEFT JOIN roles r ON r.id = e.role_id
             WHERE e.username = ?
             LIMIT 1`,
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password.",
            });
        }

        const employee = rows[0];

        // 3. Verify password
        if (!employee.password) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password.",
            });
        }

        const isMatch = await argon2.verify(
            employee.password,
            password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password.",
            });
        }

        // 4. Check JWT secret
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                error: "Authentication configuration error.",
            });
        }

        // 5. Create JWT
      
const token = jwt.sign(
    {
        employeeId: employee.id,
        roleId: employee.role_id,
        employee_number: employee.employee_number,
        username: employee.username
    },
    process.env.JWT_SECRET
);
        
        // 6. Set authentication cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // Localhost HTTP development only
            sameSite: "lax",
            path: "/",
        });

        console.log("Login successful. Token cookie set.");

        // 7. Clean login response
        return res.status(200).json({
            success: true,
            message: `Login successfully. Welcome, ${employee.username}!`,
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: "Something went wrong during login.",
        });
    }
};

// ========================================
// CURRENT EMPLOYEE (ME)
// ========================================
const me = async (req, res) => {
    try {
        // Authentication middleware must set req.user
        const employeeId = req.user?.employeeId;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                error: "Employee ID not found in token.",
            });
        }

        const [rows] = await pool.query(
            `SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.employee_number,
                e.username,
                e.email,
                e.role_id,
                r.role_name,
                e.profile_image
             FROM employees e
             LEFT JOIN roles r ON r.id = e.role_id
             WHERE e.id = ?
             LIMIT 1`,
            [employeeId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Employee not found.",
            });
        }

        return res.status(200).json({
            success: true,
            employee: rows[0],
        });

    } catch (error) {
        console.error("ME ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: "Something went wrong.",
        });
    }
};

// ========================================
// LOGOUT
// ========================================
const logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === "production";

        // Cookie options must match the login cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Logout successfully.",
        });

    } catch (error) {
        console.error("LOGOUT ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: "Something went wrong.",
        });
    }
};

// ========================================
// EXPORT CONTROLLERS
// ========================================
module.exports = {
    login,
    me,
    logout,
};
