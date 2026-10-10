const express = require('express');
const router = express.Router();

const { authentication } = require('../middleware/authentication');
const adminOnly = require('../middleware/adminOnly');

const {
    getRoles,
    getPermissions,
    getRolePermissions,
    updateRolePermissions
} = require('../controller/rolePermissionController');

router.use(authentication, adminOnly);

router.get('/', getRoles);
router.get('/permissions', getPermissions);
router.get('/:id/permissions', getRolePermissions);
router.put('/:id/permissions', updateRolePermissions);

module.exports = router;