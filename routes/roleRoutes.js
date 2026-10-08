const express = require('express');

const router = express.Router();

const {
    createRole,
    getRoles,
    getRoleById,
    updateRole,
    deleteRole
} = require('../controller/roleController');

// ROLE ROUTES

// Create role
router.post('/', createRole);

// Get all roles
router.get('/', getRoles);

// Get role by ID
router.get('/:id', getRoleById);

// Update role
router.patch('/:id', updateRole);

// Delete role
router.delete('/:id', deleteRole);

module.exports = router;