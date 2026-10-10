
const crypto = require("crypto");
const transporter = require("../../config/mailer.js");
const { authValidator } = require("../../validator/authValidator.js");
const pool = require("../../config/db.js");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

// ========================================
// HELPERS
// ========================================

// Hash OTP using a server-side secret.
const hashOtp = (otp) =>
    crypto
        .createHmac("sha256", process.env.OTP_SECRET)
        .update(otp)
        .digest("hex");

// Hash reset token before storing it in the database.
const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

// ========================================
// LOGIN
// ========================================
const login = async (req, res) => {
    try {
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

        if (rows.length === 0 || !rows[0].password) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password.",
            });
        }

        const employee = rows[0];

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

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                error: "Authentication configuration error.",
            });
        }

        const token = jwt.sign(
            {
                employeeId: employee.id,
                roleId: employee.role_id,
                employee_number: employee.employee_number,
                username: employee.username,
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: 8 * 60 * 60 * 1000,
        });

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
// FORGOT PASSWORD - SEND EMAIL OTP
// ========================================
const forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address.",
            });
        }

        if (!process.env.OTP_SECRET) {
            throw new Error("OTP_SECRET is not configured.");
        }

        const [employees] = await pool.query(
            `SELECT id, email
             FROM employees
             WHERE LOWER(email) = ?
             LIMIT 1`,
            [email]
        );

        // Do not reveal whether an email is registered.
        const genericMessage =
            "If this email is registered, password reset instructions will be sent.";

        if (employees.length === 0) {
            return res.status(200).json({
                success: true,
                message: genericMessage,
            });
        }

        const employee = employees[0];

        if (!employee.email) {
            return res.status(200).json({
                success: true,
                message: genericMessage,
            });
        }

        const otp = crypto
            .randomInt(0, 1000000)
            .toString()
            .padStart(6, "0");

        const otpHash = hashOtp(otp);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Save a new OTP and invalidate any previous reset session.
        await pool.query(
            `INSERT INTO password_reset_otps
                (employee_id, otp_hash, otp_expires_at,
                 attempts, verified_at, reset_token_hash,
                 reset_token_expires_at)
             VALUES (?, ?, ?, 0, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE
                otp_hash = VALUES(otp_hash),
                otp_expires_at = VALUES(otp_expires_at),
                attempts = 0,
                verified_at = NULL,
                reset_token_hash = NULL,
                reset_token_expires_at = NULL`,
            [employee.id, otpHash, expiresAt]
        );

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM || process.env.MAIL_USER,
                to: employee.email,
                subject: "POS System - Password Reset OTP",
                text:
                    `Your password reset OTP is ${otp}.\n\n` +
                    "This OTP expires in 5 minutes. " +
                    "Do not share it with anyone.",
            });
        } catch (mailError) {
            // Invalidate the OTP if email delivery fails.
            await pool.query(
                `UPDATE password_reset_otps
                 SET otp_hash = NULL,
                     otp_expires_at = NULL
                 WHERE employee_id = ? AND otp_hash = ?`,
                [employee.id, otpHash]
            );

            throw mailError;
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
        });
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to send reset instructions.",
        });
    }
};

// ========================================
// VERIFY RESET OTP
// ========================================
const verifyResetOtp = async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const otp = String(req.body.otp || "");

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            !/^\d{6}$/.test(otp)
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email and 6-digit OTP.",
            });
        }

        if (!process.env.OTP_SECRET) {
            throw new Error("OTP_SECRET is not configured.");
        }

        const [rows] = await pool.query(
            `SELECT
                pr.id,
                pr.otp_hash,
                pr.otp_expires_at,
                pr.attempts
             FROM employees e
             INNER JOIN password_reset_otps pr
                ON pr.employee_id = e.id
             WHERE LOWER(e.email) = ?
             LIMIT 1`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP.",
            });
        }

        const reset = rows[0];

        if (
            !reset.otp_hash ||
            !reset.otp_expires_at ||
            new Date(reset.otp_expires_at).getTime() <= Date.now() ||
            reset.attempts >= 5
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP.",
            });
        }

        const submittedHash = Buffer.from(hashOtp(otp), "hex");
        const storedHash = Buffer.from(reset.otp_hash, "hex");

        if (
            submittedHash.length !== storedHash.length ||
            !crypto.timingSafeEqual(submittedHash, storedHash)
        ) {
            await pool.query(
                `UPDATE password_reset_otps
                 SET attempts = attempts + 1
                 WHERE id = ? AND attempts < 5`,
                [reset.id]
            );

            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP.",
            });
        }

        // Generate a one-time token for the password reset.
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashToken(resetToken);
        const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Consume the OTP only if it is still valid.
        const [result] = await pool.query(
            `UPDATE password_reset_otps
             SET otp_hash = NULL,
                 otp_expires_at = NULL,
                 verified_at = NOW(),
                 reset_token_hash = ?,
                 reset_token_expires_at = ?
             WHERE id = ?
               AND otp_hash = ?
               AND otp_expires_at > NOW()
               AND attempts < 5`,
            [
                resetTokenHash,
                resetExpiresAt,
                reset.id,
                reset.otp_hash,
            ]
        );

        if (result.affectedRows !== 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully.",
            resetToken,
        });
    } catch (error) {
        console.error("VERIFY OTP ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to verify OTP.",
        });
    }
};

// ========================================
// RESET PASSWORD
// ========================================
const resetPassword = async (req, res) => {
    let connection;
    let transactionStarted = false;

    try {
        const resetToken = String(req.body.resetToken || "");
        const newPassword = req.body.newPassword;

        if (!/^[a-f0-9]{64}$/.test(resetToken)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset session.",
            });
        }

        if (
            typeof newPassword !== "string" ||
            newPassword.length < 12 ||
            newPassword.length > 128
        ) {
            return res.status(400).json({
                success: false,
                message: "Password must be 12–128 characters long.",
            });
        }

        connection = await pool.getConnection();

        await connection.beginTransaction();
        transactionStarted = true;

        const [rows] = await connection.query(
            `SELECT id, employee_id
             FROM password_reset_otps
             WHERE reset_token_hash = ?
               AND reset_token_expires_at > NOW()
             LIMIT 1
             FOR UPDATE`,
            [hashToken(resetToken)]
        );

        if (rows.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset session.",
            });
        }

        const reset = rows[0];
        const passwordHash = await argon2.hash(newPassword);

        const [updateResult] = await connection.query(
            `UPDATE employees
             SET password = ?
             WHERE id = ?`,
            [passwordHash, reset.employee_id]
        );

        if (updateResult.affectedRows !== 1) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message: "Employee account was not found.",
            });
        }

        // Delete the reset record so the token cannot be reused.
        await connection.query(
            `DELETE FROM password_reset_otps
             WHERE id = ?`,
            [reset.id]
        );

        await connection.commit();
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please log in again.",
        });
    } catch (error) {
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("ROLLBACK ERROR:", rollbackError.message);
            }
        }

        console.error("RESET PASSWORD ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset password.",
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// ========================================
// EXPORT CONTROLLERS
// ========================================
module.exports = {
    login,
    me,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
};
