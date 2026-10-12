
const pool = require('../config/db');

const activityLogger = ({
    action,
    module,
    getRecordId,
    getDetails
} = {}) => {
    if (!action || !module) {
        throw new Error(
            'activityLogger requires action and module.'
        );
    }

    return (req, res, next) => {
        const employeeId = req.user?.employeeId;

        if (!employeeId) {
            return next();
        }

        let logged = false;

        res.once('finish', () => {
            if (logged || res.statusCode >= 400) return;
            logged = true;

            const sessionId =
                req.user?.attendanceSessionId || null;

            let recordId = null;
            let details = null;

            try {
                recordId = getRecordId
                    ? getRecordId(req, res)
                    : null;

                details = getDetails
                    ? getDetails(req, res)
                    : null;
            } catch (error) {
                console.error(
                    'Unable to build activity details:',
                    error
                );
            }

            pool.query(
                `INSERT INTO employee_activity_logs
                (
                    employee_id, session_id, action, module,
                    record_id, details, ip_address, http_method,
                    endpoint, response_status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    employeeId,
                    sessionId,
                    action,
                    module,
                    recordId == null ? null : String(recordId),
                    details == null ? null : JSON.stringify(details),
                    req.ip || req.socket?.remoteAddress || null,
                    req.method,
                    req.originalUrl.split('?')[0].slice(0, 255),
                    res.statusCode
                ]
            ).catch(error => {
                console.error('Activity logging failed:', error);
            });
        });

        next();
    };
};

module.exports = activityLogger;
