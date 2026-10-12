
const pool = require('../config/db');

const myActivities = async (req, res) => {
    try {
        const { module, action, from, to } = req.query;
        const conditions = ['employee_id = ?'];
        const params = [req.user.employeeId];

        if (module) {
            conditions.push('module = ?');
            params.push(module);
        }

        if (action) {
            conditions.push('action = ?');
            params.push(action);
        }

        if (from) {
            conditions.push('created_at >= ?');
            params.push(`${from} 00:00:00`);
        }

        if (to) {
            conditions.push(
                'created_at < DATE_ADD(?, INTERVAL 1 DAY)'
            );
            params.push(to);
        }

        const [rows] = await pool.query(
            `SELECT id, session_id, action, module, record_id,
                    details, ip_address, http_method, endpoint,
                    response_status, created_at
             FROM employee_activity_logs
             WHERE ${conditions.join(' AND ')}
             ORDER BY created_at DESC
             LIMIT 500`,
            params
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('My activity error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve activity history.'
        });
    }
};

const employeeActivities = async (req, res) => {
    const employeeId = Number(req.params.id);

    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid employee ID.'
        });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id, employee_id, session_id, action, module,
                    record_id, details, ip_address, http_method,
                    endpoint, response_status, created_at
             FROM employee_activity_logs
             WHERE employee_id = ?
             ORDER BY created_at DESC
             LIMIT 500`,
            [employeeId]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Employee activity error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve employee activity.'
        });
    }
};

module.exports = { myActivities, employeeActivities };
