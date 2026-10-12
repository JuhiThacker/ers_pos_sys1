
const express = require('express');
const router = express.Router();

const { authentication } =
    require('../middleware/authentication');

const { checkPermission } =
    require('../middleware/permissionMiddleware');

const {
    myActivities,
    employeeActivities
} = require('../controllers/activityController');

router.use(authentication);

router.get('/my', myActivities);

router.get(
    '/employee/:id',
    checkPermission('activity.view'),
    employeeActivities
);

module.exports = router;
