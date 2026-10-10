const express = require('express');
const router = express.Router();

const { authentication } = require('../middleware/authentication');

const checkPermission = require('../middleware/permissionMiddleware');


const {
    createShift,
    getShifts,
    updateShift,
    assignShift
} = require('../controller/shiftController');

router.use(authentication);

router.get(
    '/',
    checkPermission('shift.view'),
    getShifts
);

router.post(
    '/',
    checkPermission('shift.manage'),
    createShift
);

router.put(
    '/:id',
    checkPermission('shift.manage'),
    updateShift
);

router.post(
    '/assignments',
    checkPermission('shift.assign'),
    assignShift
);

module.exports = router;