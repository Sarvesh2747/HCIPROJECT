const express = require('express');
const router = express.Router();

const knex = require('knex')(require('../../knexfile').development);
const { isAuthenticated, isTeacher } = require('../middleware/authMiddleware');
const announcementController = require('../controllers/announcementController');
const attendanceController = require('../controllers/attendanceController');
const paymentController = require('../controllers/paymentController');

// Protect all routes in this file
router.use(isAuthenticated, isTeacher);

// [SSR] GET /teacher/dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const batches = await knex('batches').select('id', 'name');

        // Fetch data for widgets
        const [overdueResult] = await knex('invoices').where('status', 'PENDING').andWhere('due_on', '<', knex.fn.now()).count({ count: 'id' });
        const [paymentsResult] = await knex('payments').where('status', 'SUCCESS').count({ count: 'id' });

        console.log('overdueResult:', overdueResult);
        console.log('paymentsResult:', paymentsResult);

        const recentActivities = await knex('payments')
            .join('users', 'payments.student_id', 'users.id')
            .select('users.name as student_name', 'payments.amount_cents')
            .orderBy('payments.created_at', 'desc')
            .limit(5);

        const announcements = await knex('announcements')
            .join('batches', 'announcements.batch_id', 'batches.id')
            .select('announcements.title', 'batches.name as batch_name', 'announcements.created_at')
            .orderBy('announcements.created_at', 'desc')
            .limit(5);

        const [todaysClassesResult] = await knex('batches').count({ count: 'id' });

        const [pendingAttendanceResult] = await knex('batches')
            .whereNotExists(function() {
                this.select('*').from('attendance').whereRaw('attendance.batch_id = batches.id and date(attendance.date) = current_date');
            })
            .count({ count: 'id' });

        res.render('pages/teacher/dashboard', { 
            title: 'Teacher Dashboard', 
            batches,
            todaysClasses: todaysClassesResult.count,
            pendingAttendance: pendingAttendanceResult.count,
            overdueInvoices: overdueResult.count,
            recentPayments: paymentsResult.count,
            activities: recentActivities,
            announcements
        });
    } catch (err) {
        next(err);
    }
});

// [API] POST /announcements
router.post('/announcements', announcementController.create);

// [SSR] GET /teacher/attendance
router.get('/attendance', async (req, res, next) => {
    try {
        const { batch_id, date } = req.query;
        const batches = await knex('batches').select('id', 'name');
        let students = [];

        if (batch_id && date) {
            // Find students enrolled in the selected batch and their attendance status for the given date
            students = await knex('students')
                .join('enrollments', 'students.id', 'enrollments.student_id')
                .join('users', 'students.user_id', 'users.id')
                .leftJoin('attendance', function() {
                    this.on('students.id', '=', 'attendance.student_id')
                        .andOn('attendance.date', '=', knex.raw('?', [date]));
                })
                .where('enrollments.batch_id', batch_id)
                .select('students.id', 'students.roll_no', 'users.name', 'attendance.status');
        }

        res.render('pages/teacher/attendance', {
            title: 'Mark Attendance',
            batches,
            students,
            selectedBatchId: batch_id,
            selectedDate: date
        });

    } catch (err) {
        next(err);
    }
});

// [API] POST /teacher/attendance/mark
router.post('/attendance/mark', attendanceController.mark);

// [SSR] GET /teacher/payments
router.get('/payments', async (req, res, next) => {
    try {
        const students = await knex('students').join('users', 'students.user_id', 'users.id').select('students.id', 'students.roll_no', 'users.name');
        const batches = await knex('batches').select('id', 'name');
        const payments = await knex('payments')
            .join('students', 'payments.student_id', 'students.id')
            .join('users', 'students.user_id', 'users.id')
            .join('batches', 'payments.batch_id', 'batches.id')
            .select(
                'users.name as student_name',
                'batches.name as batch_name',
                'payments.amount_cents',
                'payments.mode',
                'payments.paid_on'
            )
            .orderBy('payments.paid_on', 'desc')
            .limit(10);

        res.render('pages/teacher/payments', {
            title: 'Manage Payments',
            students,
            batches,
            payments
        });
    } catch (err) {
        next(err);
    }
});

// [API] POST /teacher/payments/manual
router.post('/payments/manual', paymentController.createManual);


// [API] GET /teacher/dashboard/student-distribution
router.get('/dashboard/student-distribution', async (req, res, next) => {
    try {
        const studentDistribution = await knex('batches')
            .leftJoin('enrollments', 'batches.id', 'enrollments.batch_id')
            .select('batches.name')
            .count('enrollments.student_id as studentCount')
            .groupBy('batches.name');

        res.json(studentDistribution);
    } catch (err) {
        next(err);
    }
});

// [API] POST /teacher/batches
router.post('/batches', async (req, res, next) => {
    try {
        const { name } = req.body;
        await knex('batches').insert({ name });
        res.redirect('/teacher/dashboard');
    } catch (err) {
        next(err);
    }
});

// [API] DELETE /teacher/batches/:id
router.delete('/batches/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await knex('batches').where({ id }).del();
        res.redirect('/teacher/dashboard');
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/edit
router.get('/batches/:id/edit', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        res.render('pages/teacher/edit-batch', { title: 'Edit Batch', batch });
    } catch (err) {
        next(err);
    }
});

// [API] PUT /teacher/batches/:id
router.put('/batches/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        await knex('batches').where({ id }).update({ name });
        res.redirect('/teacher/dashboard');
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/students/search
router.get('/students/search', async (req, res, next) => {
    try {
        const { name } = req.query;
        const students = await knex('students')
            .join('users', 'students.user_id', 'users.id')
            .join('enrollments', 'students.id', 'enrollments.student_id')
            .join('batches', 'enrollments.batch_id', 'batches.id')
            .where('users.name', 'like', `%${name}%`)
            .select('users.name', 'users.email', 'batches.name as batch_name');

        res.render('pages/teacher/student-search-results', { title: 'Student Search Results', students });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/students/:id
router.get('/students/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [student] = await knex('students')
            .join('users', 'students.user_id', 'users.id')
            .join('enrollments', 'students.id', 'enrollments.student_id')
            .join('batches', 'enrollments.batch_id', 'batches.id')
            .where('students.id', id)
            .select('students.id', 'users.name', 'users.email', 'batches.name as batch_name', 'students.roll_no');

        res.render('pages/teacher/student-profile', { title: 'Student Profile', student });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/students/:id/attendance
router.get('/students/:id/attendance', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [student] = await knex('students').join('users', 'students.user_id', 'users.id').where('students.id', id).select('students.id', 'users.name');
        const attendance = await knex('attendance').where({ student_id: id });

        res.render('pages/teacher/student-attendance', { title: 'Student Attendance', student, attendance });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/students/:id/payments
router.get('/students/:id/payments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [student] = await knex('students').join('users', 'students.user_id', 'users.id').where('students.id', id).select('students.id', 'users.name');
        const payments = await knex('payments').where({ student_id: id });

        res.render('pages/teacher/student-payments', { title: 'Student Payments', student, payments });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/schedule
router.get('/batches/:id/schedule', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        const schedule = [
            { date: '2025-10-01', time: '10:00 AM', topic: 'Introduction to Algebra' },
            { date: '2025-10-03', time: '10:00 AM', topic: 'Linear Equations' },
            { date: '2025-10-06', time: '10:00 AM', topic: 'Quadratic Equations' },
        ];

        res.render('pages/teacher/batch-schedule', { title: 'Batch Schedule', batch, schedule });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/students/new
router.get('/batches/:id/students/new', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        res.render('pages/teacher/new-student', { title: 'Add New Student', batch });
    } catch (err) {
        next(err);
    }
});

// [API] POST /teacher/batches/:id/students
router.post('/batches/:id/students', async (req, res, next) => {
    try {
        const { id: batch_id } = req.params;
        const { name, email, roll_no } = req.body;

        // Create a new user
        const [newUser] = await knex('users').insert({ name, email, role: 'STUDENT' }).returning('id');

        // Create a new student
        const [newStudent] = await knex('students').insert({ user_id: newUser.id, roll_no }).returning('id');

        // Enroll the student in the batch
        await knex('enrollments').insert({ student_id: newStudent.id, batch_id });

        res.redirect(`/teacher/batches/${batch_id}/schedule`);
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/students
router.get('/batches/:id/students', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        const students = await knex('students')
            .join('users', 'students.user_id', 'users.id')
            .join('enrollments', 'students.id', 'enrollments.student_id')
            .where('enrollments.batch_id', id)
            .select('students.id', 'users.name', 'users.email', 'students.roll_no');

        res.render('pages/teacher/batch-students', { title: 'Batch Students', batch, students });
    } catch (err) {
        next(err);
    }
});

// [API] DELETE /teacher/batches/:batch_id/students/:student_id
router.delete('/batches/:batch_id/students/:student_id', async (req, res, next) => {
    try {
        const { batch_id, student_id } = req.params;
        await knex('enrollments').where({ batch_id, student_id }).del();
        res.redirect(`/teacher/batches/${batch_id}/students`);
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/attendance
router.get('/batches/:id/attendance', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        const students = await knex('students')
            .join('users', 'students.user_id', 'users.id')
            .join('enrollments', 'students.id', 'enrollments.student_id')
            .where('enrollments.batch_id', id)
            .select('students.id', 'users.name');

        res.render('pages/teacher/mark-attendance', { title: 'Mark Attendance', batch, students });
    } catch (err) {
        next(err);
    }
});

// [API] POST /teacher/batches/:id/attendance
router.post('/batches/:id/attendance', async (req, res, next) => {
    try {
        const { id: batch_id } = req.params;
        const { date, students } = req.body;

        const attendanceData = Object.values(students).map(student => ({
            student_id: student.student_id,
            batch_id,
            date,
            status: student.status,
        }));

        await knex('attendance').insert(attendanceData);

        res.redirect(`/teacher/batches/${batch_id}/schedule`);
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/attendance/view
router.get('/batches/:id/attendance/view', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date } = req.query;
        const [batch] = await knex('batches').where({ id });

        let attendance = [];
        if (date) {
            attendance = await knex('attendance')
                .join('students', 'attendance.student_id', 'students.id')
                .join('users', 'students.user_id', 'users.id')
                .where({ 'attendance.batch_id': id, 'attendance.date': date })
                .select('users.name as student_name', 'attendance.status');
        }

        res.render('pages/teacher/view-attendance', { title: 'View Attendance', batch, attendance, date: date || '' });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/payments
router.get('/batches/:id/payments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        const payments = await knex('payments')
            .join('students', 'payments.student_id', 'students.id')
            .join('users', 'students.user_id', 'users.id')
            .where({ 'payments.batch_id': id })
            .select('users.name as student_name', 'payments.amount_cents', 'payments.paid_on', 'payments.mode');

        res.render('pages/teacher/batch-payments', { title: 'Batch Payments', batch, payments });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /teacher/batches/:id/announcements/new
router.get('/batches/:id/announcements/new', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [batch] = await knex('batches').where({ id });
        res.render('pages/teacher/new-announcement', { title: 'New Announcement', batch });
    } catch (err) {
        next(err);
    }
});

// [API] POST /teacher/batches/:id/announcements
router.post('/batches/:id/announcements', async (req, res, next) => {
    try {
        const { id: batch_id } = req.params;
        const { title, body } = req.body;
        const teacher_id = req.session.user.id;

        await knex('announcements').insert({
            batch_id,
            teacher_id,
            title,
            body,
        });

        res.redirect(`/teacher/batches/${batch_id}/schedule`);
    } catch (err) {
        next(err);
    }
});

// Add other teacher routes here...

module.exports = router;