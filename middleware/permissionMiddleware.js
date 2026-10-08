const pool = require('../config/db');

// PERMISSION MIDDLEWARE

const checkPermission = (permissionName) => {

    return async (req, res, next) => {

        try {

            // 1. Check authentication

            if (!req.user) {

                return res.status(401).json({
                    success: false,
                    message: 'Authentication required.'
                });

            }

            // 2. Check role ID

            const roleId = req.user.roleId;

            if (!roleId) {

                return res.status(403).json({
                    success: false,
                    message: 'User role not found.'
                });

            }

            // 3. Check permission

            const [rows] = await pool.execute(
                `
                SELECT
                    p.id,
                    p.permission_name
                FROM role_permissions rp
                INNER JOIN permissions p
                    ON p.id = rp.permission_id
                WHERE rp.role_id = ?
                  AND p.permission_name = ?
                LIMIT 1
                `,
                [roleId, permissionName]
            );

            // 4. Permission denied

            if (rows.length === 0) {

                return res.status(403).json({
                    success: false,
                    message: 'Permission denied.',
                    required_permission: permissionName
                });

            }

            // 5. Permission granted

            next();

        } catch (error) {

            console.error(
                'Permission middleware error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Error checking permission.'
            });

        }

    };

};

module.exports = checkPermission;