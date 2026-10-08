const db = require('../config/db');

// CREATE ROLE

const createRole = async (req, res) => {
    try {

        const {
            role_name,
            description,
            is_system_role
        } = req.body;

        // Validation

        if (!role_name || role_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Role name is required.'
            });
        }

        // Check duplicate role

        const [existingRole] = await db.execute(
            `SELECT id
             FROM roles
             WHERE role_name = ?`,
            [role_name.trim()]
        );


        if (existingRole.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Role already exists.'
            });
        }


        // Insert role

        const [result] = await db.execute(
            `INSERT INTO roles
                (role_name, description, is_system_role)
             VALUES (?, ?, ?)`,
            [
                role_name.trim(),
                description || null,
                is_system_role ? 1 : 0
            ]
        );


        // Response

        return res.status(201).json({
            success: true,
            message: 'Role created successfully.',
            data: {
                id: result.insertId,
                role_name: role_name.trim(),
                description: description || null,
                is_system_role: is_system_role ? 1 : 0
            }
        });

    } catch (error) {

        console.error('Create Role Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create role.',
            error: error.message
        });
    }
};


// GET ALL ROLES

const getRoles = async (req, res) => {
    try {

        const [roles] = await db.execute(
            `SELECT
                id,
                role_name,
                description,
                is_system_role
             FROM roles
             ORDER BY id ASC`
        );


        return res.status(200).json({
            success: true,
            message: 'Roles fetched successfully.',
            data: roles
        });

    } catch (error) {

        console.error('Get Roles Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch roles.',
            error: error.message
        });
    }
};

// GET ROLE BY ID

const getRoleById = async (req, res) => {
    try {

        const { id } = req.params;


        const [roles] = await db.execute(
            `SELECT
                id,
                role_name,
                description,
                is_system_role
             FROM roles
             WHERE id = ?`,
            [id]
        );


        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }


        return res.status(200).json({
            success: true,
            message: 'Role fetched successfully.',
            data: roles[0]
        });

    } catch (error) {

        console.error('Get Role Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch role.',
            error: error.message
        });
    }
};

// UPDATE ROLE

const updateRole = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            role_name,
            description,
            is_system_role
        } = req.body;

        // Check role exists

        const [existingRole] = await db.execute(
            `SELECT *
             FROM roles
             WHERE id = ?`,
            [id]
        );


        if (existingRole.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        // Prevent duplicate role name

        if (role_name) {

            const [duplicateRole] = await db.execute(
                `SELECT id
                 FROM roles
                 WHERE role_name = ?
                 AND id != ?`,
                [
                    role_name.trim(),
                    id
                ]
            );


            if (duplicateRole.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Another role with this name already exists.'
                });
            }
        }

        // Update role

        await db.execute(
            `UPDATE roles
             SET
                role_name = ?,
                description = ?,
                is_system_role = ?
             WHERE id = ?`,
            [
                role_name !== undefined
                    ? role_name.trim()
                    : existingRole[0].role_name,

                description !== undefined
                    ? description
                    : existingRole[0].description,

                is_system_role !== undefined
                    ? (is_system_role ? 1 : 0)
                    : existingRole[0].is_system_role,

                id
            ]
        );


        return res.status(200).json({
            success: true,
            message: 'Role updated successfully.'
        });

    } catch (error) {

        console.error('Update Role Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update role.',
            error: error.message
        });
    }
};

// DELETE ROLE

const deleteRole = async (req, res) => {
    try {

        const { id } = req.params;

        // Check role

        const [roles] = await db.execute(
            `SELECT *
             FROM roles
             WHERE id = ?`,
            [id]
        );


        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        // Prevent deleting system role

        if (roles[0].is_system_role === 1) {
            return res.status(403).json({
                success: false,
                message: 'System roles cannot be deleted.'
            });
        }

        // Delete role

        await db.execute(
            `DELETE FROM roles
             WHERE id = ?`,
            [id]
        );


        return res.status(200).json({
            success: true,
            message: 'Role deleted successfully.'
        });

    } catch (error) {

        console.error('Delete Role Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to delete role.',
            error: error.message
        });
    }
};

// EXPORT

module.exports = {
    createRole,
    getRoles,
    getRoleById,
    updateRole,
    deleteRole
};