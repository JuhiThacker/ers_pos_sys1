const db = require('../config/db');

const createShift = async (req, res) => {
    try {
        const {
            shift_code,
            shift_name,
            shift_type = 'fixed',
            start_time,
            end_time,
            break_minutes = 0,
            is_overnight = false
        } = req.body;

        if (
            !shift_code || !shift_name ||
            !start_time || !end_time ||
            !['fixed', 'rotating'].includes(shift_type)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Provide shift_code, shift_name, shift_type, start_time and end_time.'
            });
        }

        if (
            !Number.isInteger(Number(break_minutes)) ||
            Number(break_minutes) < 0 ||
            Number(break_minutes) > 1440
        ) {
            return res.status(400).json({
                success: false,
                message: 'break_minutes must be between 0 and 1440.'
            });
        }

        if (typeof is_overnight !== 'boolean' &&
            ![0, 1, '0', '1'].includes(is_overnight)) {
            return res.status(400).json({
                success: false,
                message: 'is_overnight must be true or false.'
            });
        }

        const overnight = [true, 1, '1'].includes(is_overnight);

        // Times are expected in HH:MM or HH:MM:SS format.
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

        if (!timePattern.test(start_time) || !timePattern.test(end_time)) {
            return res.status(400).json({
                success: false,
                message: 'Times must use HH:MM or HH:MM:SS format.'
            });
        }

        if (
            (!overnight && end_time <= start_time) ||
            (overnight && end_time >= start_time)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Shift times do not match the overnight setting.'
            });
        }

        const [result] = await db.execute(
            `INSERT INTO shifts
                (shift_code, shift_name, shift_type, start_time,
                 end_time, break_minutes, is_overnight, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shift_code.trim(),
                shift_name.trim(),
                shift_type,
                start_time,
                end_time,
                Number(break_minutes),
                overnight ? 1 : 0,
                req.user.employeeId
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Shift created successfully.',
            shiftId: result.insertId
        });
    } catch (error) {
        console.error('Create shift error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'That shift code already exists.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Unable to create shift.'
        });
    }
};

const getShifts = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, shift_code, shift_name, shift_type,
                    start_time, end_time, break_minutes,
                    is_overnight, is_active, created_at, updated_at
             FROM shifts
             ORDER BY shift_name`
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get shifts error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve shifts.'
        });
    }
};

const updateShift = async (req, res) => {
    try {
        const shiftId = Number(req.params.id);

        if (!Number.isInteger(shiftId) || shiftId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid shift ID.'
            });
        }

        const {
            shift_name,
            shift_type,
            start_time,
            end_time,
            break_minutes,
            is_overnight,
            is_active
        } = req.body;

        const [existing] = await db.execute(
            'SELECT * FROM shifts WHERE id = ?',
            [shiftId]
        );

        if (!existing.length) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found.'
            });
        }

        const old = existing[0];
        const next = {
            shift_name: shift_name ?? old.shift_name,
            shift_type: shift_type ?? old.shift_type,
            start_time: start_time ?? old.start_time,
            end_time: end_time ?? old.end_time,
            break_minutes: break_minutes ?? old.break_minutes,
            is_overnight: is_overnight ?? old.is_overnight,
            is_active: is_active ?? old.is_active
        };

        if (!['fixed', 'rotating'].includes(next.shift_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid shift_type.'
            });
        }

        const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
        if (
            !timePattern.test(String(next.start_time)) ||
            !timePattern.test(String(next.end_time))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid shift time.'
            });
        }

        const overnight = [true, 1, '1'].includes(next.is_overnight);

        if (
            (!overnight && next.end_time <= next.start_time) ||
            (overnight && next.end_time >= next.start_time)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Shift times do not match the overnight setting.'
            });
        }

        const breakMinutes = Number(next.break_minutes);
        if (
            !Number.isInteger(breakMinutes) ||
            breakMinutes < 0 ||
            breakMinutes > 1440
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid break_minutes.'
            });
        }

        await db.execute(
            `UPDATE shifts
             SET shift_name = ?, shift_type = ?, start_time = ?,
                 end_time = ?, break_minutes = ?, is_overnight = ?,
                 is_active = ?
             WHERE id = ?`,
            [
                next.shift_name,
                next.shift_type,
                next.start_time,
                next.end_time,
                breakMinutes,
                overnight ? 1 : 0,
                [true, 1, '1'].includes(next.is_active) ? 1 : 0,
                shiftId
            ]
        );

        return res.json({
            success: true,
            message: 'Shift updated. Existing attendance snapshots remain unchanged.'
        });
    } catch (error) {
        console.error('Update shift error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update shift.'
        });
    }
};

const assignShift = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            assignment_type,
            branch_id,
            employee_id,
            shift_id,
            rotation_pattern_id,
            effective_from,
            effective_to = null
        } = req.body;

        if (!['branch', 'employee'].includes(assignment_type)) {
            return res.status(400).json({
                success: false,
                message: 'assignment_type must be branch or employee.'
            });
        }

        const isBranch = assignment_type === 'branch';
        const targetId = Number(isBranch ? branch_id : employee_id);

        if (!Number.isInteger(targetId) || targetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Provide a valid branch_id or employee_id.'
            });
        }

        if (!effective_from ||
            (effective_to && effective_to < effective_from)) {
            return res.status(400).json({
                success: false,
                message: 'Provide a valid effective date range.'
            });
        }

        const hasShift = shift_id !== undefined &&
            shift_id !== null && shift_id !== '';
        const hasPattern = rotation_pattern_id !== undefined &&
            rotation_pattern_id !== null && rotation_pattern_id !== '';

        if (hasShift === hasPattern) {
            return res.status(400).json({
                success: false,
                message: 'Provide exactly one of shift_id or rotation_pattern_id.'
            });
        }

        await connection.beginTransaction();

        if (isBranch) {
            const [target] = await connection.execute(
                'SELECT id FROM branches WHERE id = ?',
                [targetId]
            );

            if (!target.length) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Branch not found.'
                });
            }
        } else {
            const [target] = await connection.execute(
                'SELECT id FROM employees WHERE id = ?',
                [targetId]
            );

            if (!target.length) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found.'
                });
            }
        }

        if (hasShift) {
            const [targetShift] = await connection.execute(
                'SELECT id FROM shifts WHERE id = ? AND is_active = 1',
                [Number(shift_id)]
            );

            if (!targetShift.length) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Active shift not found.'
                });
            }
        } else {
            const [pattern] = await connection.execute(
                `SELECT id FROM shift_rotation_patterns
                 WHERE id = ? AND is_active = 1`,
                [Number(rotation_pattern_id)]
            );

            if (!pattern.length) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Active rotation pattern not found.'
                });
            }
        }

        const targetColumn = isBranch ? 'branch_id' : 'employee_id';

        // End any overlapping assignment of the same target type.
        // The previous history is preserved; it is never deleted.
        const [overlapping] = await connection.execute(
            `SELECT id, effective_from, effective_to
             FROM shift_assignments
             WHERE assignment_type = ?
               AND ${targetColumn} = ?
               AND effective_from <= COALESCE(?, '9999-12-31')
               AND COALESCE(effective_to, '9999-12-31') >= ?
             FOR UPDATE`,
            [
                assignment_type,
                targetId,
                effective_to,
                effective_from
            ]
        );

        for (const row of overlapping) {
            if (row.effective_from < effective_from) {
                const previousEnd = new Date(`${effective_from}T00:00:00`);
                previousEnd.setDate(previousEnd.getDate() - 1);
                const yyyy = previousEnd.getFullYear();
                const mm = String(previousEnd.getMonth() + 1).padStart(2, '0');
                const dd = String(previousEnd.getDate()).padStart(2, '0');

                await connection.execute(
                    'UPDATE shift_assignments SET effective_to = ? WHERE id = ?',
                    [`${yyyy}-${mm}-${dd}`, row.id]
                );
            } else {
                await connection.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'An assignment already starts within the requested date range. Close or correct that assignment first.'
                });
            }
        }

        const [result] = await connection.execute(
            `INSERT INTO shift_assignments
                (assignment_type, branch_id, employee_id, shift_id,
                 rotation_pattern_id, effective_from, effective_to, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                assignment_type,
                isBranch ? targetId : null,
                isBranch ? null : targetId,
                hasShift ? Number(shift_id) : null,
                hasPattern ? Number(rotation_pattern_id) : null,
                effective_from,
                effective_to,
                req.user.employeeId
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Shift assignment created.',
            assignmentId: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Assign shift error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to assign shift.'
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    createShift,
    getShifts,
    updateShift,
    assignShift
};