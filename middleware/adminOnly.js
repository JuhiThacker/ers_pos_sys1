const db = require('../config/db');

const adminOnly = async (req, res, next) => {
    try {
        const employeeId = req.user?.employeeId;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const [rows] = await db.execute(
            `SELECT r.role_name
             FROM employees e
             INNER JOIN roles r ON r.id = e.role_id
             WHERE e.id = ?
             LIMIT 1`,
            [employeeId]
        );

        if (
            rows.length === 0 ||
            rows[0].role_name.toLowerCase() !== 'admin'
        ) {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can manage roles and permissions.'
            });
        }

        next();
    } catch (error) {
        console.error('Admin authorization error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to verify administrator access.'
        });
    }
};

module.exports = adminOnly;