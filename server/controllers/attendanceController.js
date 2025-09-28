const knex = require('knex')(require('../../knexfile').development);
const { logAction } = require('../services/auditLogService');

exports.mark = async (req, res, next) => {
    const { batch_id, date, students } = req.body;
    const marked_by = req.session.user.id;

    if (!batch_id || !date || !students) {
        return res.status(400).send('Missing required attendance data.');
    }

    try {
        // 1. Fetch the "before" state for audit logging
        const oldAttendance = await knex('attendance').where({ batch_id, date });
        const oldStatusMap = new Map(oldAttendance.map(att => [att.student_id, att.status]));

        const attendanceData = Object.values(students).map(student => ({
            batch_id,
            student_id: student.student_id,
            date,
            status: student.status,
            marked_by
        }));

        // 2. Use a transaction to ensure all records are inserted or none are.
        await knex.transaction(async (trx) => {
            await trx('attendance').insert(attendanceData).onConflict(['batch_id', 'student_id', 'date']).merge();
        });

        // 3. Compare and log changes
        for (const student of Object.values(students)) {
            const oldStatus = oldStatusMap.get(parseInt(student.student_id));
            const newStatus = student.status;

            if (oldStatus !== newStatus) {
                logAction({
                    user_id: marked_by,
                    action: oldStatus ? 'EDIT_ATTENDANCE' : 'CREATE_ATTENDANCE',
                    entity: 'attendance',
                    entity_id: student.student_id, // Note: This logs against the student, could be improved
                    before_json: { status: oldStatus || 'NOT_MARKED' },
                    after_json: { status: newStatus, date: date, batch_id: batch_id }
                });
            }
        }

        // Redirect back to the attendance page, preserving the query to show the list again
        res.redirect(`/teacher/attendance?batch_id=${batch_id}&date=${date}&success=true`);

    } catch (err) {
        next(err);
    }
};

exports.exportCSV = async (req, res, next) => {
    try {
        const { from_date, to_date } = req.query;
        const studentProfile = await knex('students').where({ user_id: req.session.user.id }).first();

        if (!studentProfile) {
            return res.status(403).send('Student profile not found.');
        }

        const query = knex('attendance')
            .join('batches', 'attendance.batch_id', 'batches.id')
            .where({ student_id: studentProfile.id })
            .select('attendance.date', 'attendance.status', 'batches.name as batch_name')
            .orderBy('attendance.date', 'desc');

        if (from_date && to_date) {
            query.whereBetween('date', [from_date, to_date]);
        }

        const attendance = await query;

        // Format to CSV
        const header = 'Date,Batch,Status\n';
        const csvRows = attendance.map(row => {
            const date = new Date(row.date).toLocaleDateString();
            const batch = `"${row.batch_name}"`; // Handle commas in batch name
            const status = row.status;
            return [date, batch, status].join(',');
        });

        const csvString = header + csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance_export.csv"');
        res.status(200).send(csvString);

    } catch (err) {
        next(err);
    }
};
