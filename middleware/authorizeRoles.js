
const db = require('../config/db');

const authorize = (permissionName) => {
    return async (req, res, next) => {
        try {
            // Get the employee ID from the authenticated token.
            const employeeId =
                req.user?.employeeId || req.user?.userId;

            if (!employeeId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required.'
                });
            }

            // Check whether the employee's role has this permission.
            const [rows] = await db.execute(
                `SELECT 1
                 FROM employees e
                 INNER JOIN role_permissions rp
                    ON rp.role_id = e.role_id
                 INNER JOIN permissions p
                    ON p.id = rp.permission_id
                 WHERE e.id = ?
                   AND p.permission_name = ?
                 LIMIT 1`,
                [employeeId, permissionName]
            );

            if (rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to perform this action.'
                });
            }

            return next();

        } catch (error) {
            console.error('Authorization error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to verify permissions.'
            });
        }
    };
};

module.exports = authorize;