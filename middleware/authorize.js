
const db = require('../config/db');

const authorize = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required.'
                });
            }

            const [rows] = await db.execute(
                `SELECT 1
                 FROM users u
                 INNER JOIN role_permissions rp
                    ON rp.role_id = u.role_id
                 INNER JOIN permissions p
                    ON p.id = rp.permission_id
                 WHERE u.id = ?
                   AND p.permission_name = ?
                 LIMIT 1`,
                [req.user.userId, permissionName]
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