const express = require('express');
const router = express.Router();

const { authentication } = require('../middleware/authentication');

const checkPermission =require('../middleware/permissionMiddleware');


const {
    checkIn,
    checkOut,
    getMyAttendance,
    getAttendanceReport
} = require('../controller/attendanceController');

router.use(authentication);

// Employees can access only their own records through these routes.
router.post(
    '/check-in',
    checkPermission('attendance.check_in'),
    checkIn
);

router.patch(
    '/check-out',
    checkPermission('attendance.check_out'),
    checkOut
);

router.get(
    '/me',
    checkPermission('attendance.view'),
    getMyAttendance
);

// Initially reserve cross-employee reports for roles you explicitly authorize.
// Add manager/team/branch scope filtering before granting this permission to managers.
router.get(
    '/reports',
    checkPermission('attendance.report'),
    getAttendanceReport
);

module.exports = router;