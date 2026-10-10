const db = require('../config/db');

// GET /api/roles
const getRoles = async (req, res) => {
    try {
        const [roles] = await db.execute(
            `SELECT id, role_name
             FROM roles
             ORDER BY role_name`
        );

        return res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('Get roles error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch roles.'
        });
    }
};

// GET /api/permissions
const getPermissions = async (req, res) => {
    try {
        const [permissions] = await db.execute(
            `SELECT id, permission_name
             FROM permissions
             ORDER BY permission_name`
        );

        return res.json({
            success: true,
            data: permissions
        });
    } catch (error) {
        console.error('Get permissions error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch permissions.'
        });
    }
};

// GET /api/roles/:id/permissions
const getRolePermissions = async (req, res) => {
    try {
        const roleId = Number(req.params.id);

        if (!Number.isSafeInteger(roleId) || roleId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role ID.'
            });
        }

        const [roles] = await db.execute(
            'SELECT id, role_name FROM roles WHERE id = ?',
            [roleId]
        );

        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        const [permissions] = await db.execute(
            `SELECT p.id, p.permission_name
             FROM permissions p
             INNER JOIN role_permissions rp
                ON rp.permission_id = p.id
             WHERE rp.role_id = ?
             ORDER BY p.permission_name`,
            [roleId]
        );

        return res.json({
            success: true,
            role: roles[0],
            data: permissions
        });
    } catch (error) {
        console.error('Get role permissions error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch role permissions.'
        });
    }
};

// PUT /api/roles/:id/permissions
const updateRolePermissions = async (req, res) => {
    const roleId = Number(req.params.id);
    const permissionIds = req.body.permissionIds;

    if (!Number.isSafeInteger(roleId) || roleId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role ID.'
        });
    }

    if (
        !Array.isArray(permissionIds) ||
        !permissionIds.every(
            id => Number.isSafeInteger(id) && id > 0
        ) ||
        new Set(permissionIds).size !== permissionIds.length
    ) {
        return res.status(400).json({
            success: false,
            message: 'permissionIds must be an array of unique positive integer IDs.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [roles] = await connection.execute(
            'SELECT id FROM roles WHERE id = ? FOR UPDATE',
            [roleId]
        );

        if (roles.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        if (permissionIds.length > 0) {
            const placeholders = permissionIds.map(() => '?').join(', ');

            const [validPermissions] = await connection.execute(
                `SELECT id FROM permissions
                 WHERE id IN (${placeholders})`,
                permissionIds
            );

            if (validPermissions.length !== permissionIds.length) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: 'One or more permission IDs do not exist.'
                });
            }
        }

        // Replace this role's assignments with the selected permissions.
        await connection.execute(
            'DELETE FROM role_permissions WHERE role_id = ?',
            [roleId]
        );

        for (const permissionId of permissionIds) {
            await connection.execute(
                `INSERT INTO role_permissions (role_id, permission_id)
                 VALUES (?, ?)`,
                [roleId, permissionId]
            );
        }

        await connection.commit();

        return res.json({
            success: true,
            message: 'Role permissions updated successfully.',
            roleId,
            permissionIds
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Update role permissions error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to update role permissions.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getRoles,
    getPermissions,
    getRolePermissions,
    updateRolePermissions
};