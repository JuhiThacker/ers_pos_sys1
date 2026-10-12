const express = require('express');
const router = express.Router();

const { authentication } = require('../middleware/authentication');
const checkPermission = require('../middleware/permissionMiddleware');

const {
    checkIn,
    checkOut,
    getMyAttendance,
    getAttendanceReport,
    startBreak,
    endBreak
} = require('../controller/attendanceController');

router.use(authentication);

// Check in
router.post(
    '/check-in',
    checkPermission('attendance.check_in'),
    checkIn
);

// Check out
router.patch(
    '/check-out',
    checkPermission('attendance.check_out'),
    checkOut
);

// View own attendance
router.get(
    '/me',
    checkPermission('attendance.view'),
    getMyAttendance
);

// Attendance reports
router.get(
    '/reports',
    checkPermission('attendance.report'),
    getAttendanceReport
);

// Start a break
router.post(
    '/breaks/start',
    checkPermission('attendance.manage'),
    startBreak
);

// End a break
router.patch(
    '/breaks/end',
    checkPermission('attendance.manage'),
    endBreak
);
    
module.exports = router;
