const db = require('../config/db');
function dateString(value) {
    if (typeof value === 'string') return value.slice(0, 10);
    return null;
}

function toSqlDateTime(date, time) {
    return `${date} ${time}`;
}

async function getBranchForEmployee(connection, employeeId, date) {
    const [rows] = await connection.execute(
        `SELECT branch_id
         FROM employee_branch_assignments
         WHERE employee_id = ?
           AND effective_from <= ?
           AND (effective_to IS NULL OR effective_to >= ?)
         ORDER BY effective_from DESC, id DESC
         LIMIT 1`,
        [employeeId, date, date]
    );

    return rows[0]?.branch_id ?? null;
}

async function getEffectiveSchedule(connection, employeeId, date) {
    const branchId = await getBranchForEmployee(
        connection, employeeId, date
    );

    // Individual assignments take precedence over branch assignments.
    const [individual] = await connection.execute(
        `SELECT sa.*, s.start_time, s.end_time,
                s.break_minutes, s.is_overnight
         FROM shift_assignments sa
         LEFT JOIN shifts s ON s.id = sa.shift_id
         WHERE sa.assignment_type = 'employee'
           AND sa.employee_id = ?
           AND sa.effective_from <= ?
           AND (sa.effective_to IS NULL OR sa.effective_to >= ?)
         ORDER BY sa.effective_from DESC, sa.id DESC
         LIMIT 1`,
        [employeeId, date, date]
    );

    let assignment = individual[0] || null;

    if (!assignment && branchId) {
        const [branchAssignments] = await connection.execute(
            `SELECT sa.*, s.start_time, s.end_time,
                    s.break_minutes, s.is_overnight
             FROM shift_assignments sa
             LEFT JOIN shifts s ON s.id = sa.shift_id
             WHERE sa.assignment_type = 'branch'
               AND sa.branch_id = ?
               AND sa.effective_from <= ?
               AND (sa.effective_to IS NULL OR sa.effective_to >= ?)
             ORDER BY sa.effective_from DESC, sa.id DESC
             LIMIT 1`,
            [branchId, date, date]
        );

        assignment = branchAssignments[0] || null;
    }

    if (!assignment) {
        return { branchId, assignment: null, shift: null };
    }

    let shift = assignment.shift_id
        ? {
            id: assignment.shift_id,
            start_time: assignment.start_time,
            end_time: assignment.end_time,
            break_minutes: assignment.break_minutes,
            is_overnight: assignment.is_overnight
        }
        : null;

    // A rotating assignment selects its shift from the cycle.
    if (assignment.rotation_pattern_id) {
        const [patternRows] = await connection.execute(
            `SELECT id, cycle_days, effective_from
             FROM shift_rotation_patterns
             WHERE id = ? AND is_active = 1`,
            [assignment.rotation_pattern_id]
        );

        if (!patternRows.length) {
            throw new Error('The assigned rotation pattern is inactive or missing.');
        }

        const pattern = patternRows[0];
        const [patternDays] = await connection.execute(
            `SELECT d.day_number, s.id AS shift_id,
                    s.start_time, s.end_time,
                    s.break_minutes, s.is_overnight
             FROM shift_rotation_pattern_days d
             INNER JOIN shifts s ON s.id = d.shift_id
             WHERE d.pattern_id = ?
             ORDER BY d.day_number`,
            [pattern.id]
        );

        const days = patternDays.filter(row => row.day_number <= pattern.cycle_days);

        if (days.length !== Number(pattern.cycle_days)) {
            throw new Error('The rotation pattern must define a shift for each cycle day.');
        }

        const [dayRows] = await connection.execute(
            'SELECT DATEDIFF(?, ?) AS day_offset',
            [date, assignment.effective_from]
        );

        const offset = Number(dayRows[0].day_offset);
        const cycleIndex = ((offset % pattern.cycle_days) + pattern.cycle_days)
            % pattern.cycle_days;

        const selected = days.find(
            row => Number(row.day_number) === cycleIndex + 1
        );

        shift = {
            id: selected.shift_id,
            start_time: selected.start_time,
            end_time: selected.end_time,
            break_minutes: selected.break_minutes,
            is_overnight: selected.is_overnight
        };
    }

    return { branchId, assignment, shift };
}

function scheduledDateTimes(date, shift) {
    const start = new Date(`${date}T${shift.start_time}`);
    const end = new Date(`${date}T${shift.end_time}`);

    if (Number(shift.is_overnight)) {
        end.setDate(end.getDate() + 1);
    }

    const sqlDateTime = value => {
        const pad = number => String(number).padStart(2, '0');

        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ` +
            `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    };

    const elapsedMinutes = Math.round((end - start) / 60000);
    const scheduledMinutes = elapsedMinutes - Number(shift.break_minutes);

    if (scheduledMinutes < 0) {
        throw new Error('Break duration cannot exceed the shift duration.');
    }

    return {
        start: sqlDateTime(start),
        end: sqlDateTime(end),
        scheduledMinutes
    };
}

const checkIn = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const employeeId = req.user.employeeId;

        await connection.beginTransaction();

        // Use the database date as the attendance date.
        const [dateRows] = await connection.execute(
            'SELECT CURDATE() AS attendance_date, NOW() AS current_time'
        );

        const attendanceDate = dateString(dateRows[0].attendance_date);
        const { branchId, assignment, shift } = await getEffectiveSchedule(
            connection, employeeId, attendanceDate
        );

        if (!assignment || !shift) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'No active shift assignment exists for today.'
            });
        }

        const schedule = scheduledDateTimes(attendanceDate, shift);

        const [existing] = await connection.execute(
            `SELECT id, check_in, check_out
             FROM attendance
             WHERE employee_id = ? AND attendance_date = ?
             FOR UPDATE`,
            [employeeId, attendanceDate]
        );

        if (existing.length && existing[0].check_in) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'You have already checked in for this attendance date.'
            });
        }

        const currentTime = dateRows[0].current_time;

        if (existing.length) {
            await connection.execute(
                `UPDATE attendance
                 SET shift_assignment_id = ?, shift_id = ?, branch_id = ?,
                     scheduled_start = ?, scheduled_end = ?,
                     scheduled_minutes = ?, break_minutes = ?,
                     check_in = ?, status = 'present',
                     updated_by = ?
                 WHERE id = ?`,
                [
                    assignment.id,
                    shift.id,
                    branchId,
                    schedule.start,
                    schedule.end,
                    schedule.scheduledMinutes,
                    shift.break_minutes,
                    currentTime,
                    employeeId,
                    existing[0].id
                ]
            );
        } else {
            await connection.execute(
                `INSERT INTO attendance
                    (employee_id, attendance_date, shift_assignment_id,
                     shift_id, branch_id, scheduled_start, scheduled_end,
                     scheduled_minutes, break_minutes, check_in, status,
                     created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', ?, ?)`,
                [
                    employeeId,
                    attendanceDate,
                    assignment.id,
                    shift.id,
                    branchId,
                    schedule.start,
                    schedule.end,
                    schedule.scheduledMinutes,
                    shift.break_minutes,
                    currentTime,
                    employeeId,
                    employeeId
                ]
            );
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Checked in successfully.',
            attendanceDate,
            checkIn: currentTime
        });
    } catch (error) {
        await connection.rollback();
        console.error('Check-in error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to check in.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
};

const checkOut = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const employeeId = req.user.employeeId;

        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT id, attendance_date, check_in, check_out,
                    scheduled_minutes, break_minutes
             FROM attendance
             WHERE employee_id = ?
               AND check_out IS NULL
               AND check_in IS NOT NULL
             ORDER BY check_in DESC
             LIMIT 1
             FOR UPDATE`,
            [employeeId]
        );

        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'No open check-in record was found.'
            });
        }

        const record = rows[0];

        const [timeRows] = await connection.execute(
            'SELECT NOW() AS current_time'
        );

        const checkoutTime = new Date(timeRows[0].current_time);
        const checkinTime = new Date(record.check_in);

        const elapsedMinutes = Math.floor(
            (checkoutTime - checkinTime) / 60000
        );

        if (elapsedMinutes < 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Check-out time cannot be earlier than check-in.'
            });
        }

        // Predefined break is deducted once from actual elapsed time.
        const workedMinutes = Math.max(
            0, elapsedMinutes - Number(record.break_minutes)
        );

        const overtimeMinutes = Math.max(
            0, workedMinutes - Number(record.scheduled_minutes)
        );

        await connection.execute(
            `UPDATE attendance
             SET check_out = ?,
                 worked_minutes = ?,
                 overtime_minutes = ?,
                 updated_by = ?
             WHERE id = ?`,
            [
                timeRows[0].current_time,
                workedMinutes,
                overtimeMinutes,
                employeeId,
                record.id
            ]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: 'Checked out successfully.',
            attendanceId: record.id,
            workedMinutes,
            overtimeMinutes
        });
    } catch (error) {
        await connection.rollback();
        console.error('Check-out error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to check out.'
        });
    } finally {
        connection.release();
    }
};

// GET MY ATTENDANCE
const getMyAttendance = async (req, res) => {
    try {
        const employeeId = Number(req.user?.employeeId);

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // Get the employee's login/logout sessions
        const [sessions] = await db.execute(
            `SELECT
                id,
                login_time,
                logout_time,
                status,
                ip_address,
                last_seen_at,
                created_at
             FROM attendance_sessions
             WHERE employee_id = ?
             ORDER BY login_time DESC
             LIMIT 30`,
            [employeeId]
        );

        // Get breaks associated with the employee's sessions
        const [breaks] = await db.execute(
    `SELECT
        b.id,
        b.session_id,
        b.break_type,
        b.break_start,
        b.break_end
     FROM attendance_breaks b
     INNER JOIN attendance_sessions s
        ON s.id = b.session_id
     WHERE s.employee_id = ?
     ORDER BY b.break_start DESC
     LIMIT 100`,
    [employeeId]
);

        return res.status(200).json({
            success: true,
            message: 'Attendance retrieved successfully.',
            data: {
                sessions,
                breaks
            }
        });

    } catch (error) {
        console.error('Get my attendance error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve attendance.'
        });
    }
};


const getAttendanceReport = async (req, res) => {
    try {
        const { from, to, employee_id, branch_id } = req.query;

        if (!from || !to ||
            !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
            from > to) {
            return res.status(400).json({
                success: false,
                message: 'Provide a valid from and to date using YYYY-MM-DD.'
            });
        }

        const filters = ['a.attendance_date BETWEEN ? AND ?'];
        const params = [from, to];

        if (employee_id) {
            const id = Number(employee_id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid employee_id.'
                });
            }

            filters.push('a.employee_id = ?');
            params.push(id);
        }

        if (branch_id) {
            const id = Number(branch_id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid branch_id.'
                });
            }

            filters.push('a.branch_id = ?');
            params.push(id);
        }

        const [rows] = await db.execute(
            `SELECT a.employee_id,
                    e.employee_number, e.first_name, e.last_name,
                    a.branch_id, a.attendance_date, a.status,
                    a.check_in, a.check_out,
                    a.scheduled_minutes, a.worked_minutes,
                    a.overtime_minutes
             FROM attendance a
             INNER JOIN employees e ON e.id = a.employee_id
             WHERE ${filters.join(' AND ')}
             ORDER BY a.attendance_date DESC, e.employee_number`,
            params
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Attendance report error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to generate attendance report.'
        });
    }
};

// START BREAK
const startBreak = async (req, res) => {
    try {
        const employeeId = req.user?.employeeId;
        const { break_type } = req.body;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const allowedTypes = ['lunch', 'tea', 'personal', 'other'];

        if (!allowedTypes.includes(break_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid break type.'
            });
        }

        const [sessions] = await db.execute(
            `SELECT id
             FROM attendance_sessions
             WHERE employee_id = ?
               AND status = 'active'
               AND logout_time IS NULL
             ORDER BY login_time DESC
             LIMIT 1`,
            [employeeId]
        );

        if (sessions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No active attendance session. Please check in first.'
            });
        }

        const sessionId = sessions[0].id;

        const [existingBreaks] = await db.execute(
            `SELECT id
             FROM attendance_breaks
             WHERE session_id = ?
               AND break_end IS NULL
             LIMIT 1`,
            [sessionId]
        );

        if (existingBreaks.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'A break is already in progress.'
            });
        }

        const [result] = await db.execute(
            `INSERT INTO attendance_breaks
                (session_id, break_type, break_start)
             VALUES (?, ?, NOW())`,
            [sessionId, break_type]
        );

        return res.status(201).json({
            success: true,
            message: 'Break started successfully.',
            data: {
                id: result.insertId,
                session_id: sessionId,
                break_type
            }
        });

    } catch (error) {
        console.error('Start break error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to start break.'
        });
    }
};


// END BREAK
const endBreak = async (req, res) => {
    try {
        const employeeId = req.user?.employeeId;

        if (!employeeId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const [sessions] = await db.execute(
            `SELECT id
             FROM attendance_sessions
             WHERE employee_id = ?
               AND status = 'active'
               AND logout_time IS NULL
             ORDER BY login_time DESC
             LIMIT 1`,
            [employeeId]
        );

        if (sessions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No active attendance session found.'
            });
        }

        const sessionId = sessions[0].id;

        const [breaks] = await db.execute(
            `SELECT id, break_type, break_start
             FROM attendance_breaks
             WHERE session_id = ?
               AND break_end IS NULL
             ORDER BY break_start DESC
             LIMIT 1`,
            [sessionId]
        );

        if (breaks.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No active break found.'
            });
        }

        const [result] = await db.execute(
            `UPDATE attendance_breaks
             SET break_end = NOW()
             WHERE id = ?
               AND break_end IS NULL`,
            [breaks[0].id]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                success: false,
                message: 'The break has already ended.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Break ended successfully.',
            data: {
                id: breaks[0].id,
                break_type: breaks[0].break_type,
                break_start: breaks[0].break_start
            }
        });

    } catch (error) {
        console.error('End break error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to end break.'
        });
    }
};


module.exports = {
    checkIn,
    checkOut,
    getMyAttendance,
    getAttendanceReport,
    startBreak,
    endBreak
};