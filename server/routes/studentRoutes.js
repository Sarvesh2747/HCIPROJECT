const express = require('express');
const router = express.Router();

const knex = require('knex')(require('../../knexfile').development);
const { isAuthenticated, isStudent } = require('../middleware/authMiddleware');
const receiptController = require('../controllers/receiptController');
const attendanceController = require('../controllers/attendanceController');

// Protect all routes in this file
router.use(isAuthenticated, isStudent);

// [SSR] GET /student/dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const studentProfile = await knex('students').where({ user_id: req.session.user.id }).first();
        if (!studentProfile) {
            return next(new Error('Student profile not found.'));
        }

        // Widget 1: Attendance Percentage
        const [presentResult] = await knex('attendance').where({ student_id: studentProfile.id, status: 'PRESENT' }).count({ count: 'id' });
        const [totalResult] = await knex('attendance').where({ student_id: studentProfile.id }).count({ count: 'id' });
        const attendancePercentage = totalResult.count > 0 ? Math.round((presentResult.count / totalResult.count) * 100) : 100;

        // Widget 2: Next Due Invoice
        const nextDueInvoice = await knex('invoices')
            .where({ student_id: studentProfile.id, status: 'PENDING' })
            .andWhere('due_on', '>=', knex.fn.now())
            .orderBy('due_on', 'asc')
            .first();

        // Widget 3: Last Payment
        const lastPayment = await knex('payments')
            .where({ student_id: studentProfile.id, status: 'SUCCESS' })
            .orderBy('paid_on', 'desc')
            .first();

        // Widget 4: Announcements (already fetched)
        const enrollments = await knex('enrollments').where({ student_id: studentProfile.id });
        const batchIds = enrollments.map(e => e.batch_id);
        let announcements = [];
        if (batchIds.length > 0) {
            announcements = await knex('announcements')
                .whereIn('batch_id', batchIds)
                .orderBy('created_at', 'desc')
                .limit(5);
        }

        res.render('pages/student/dashboard', { 
            title: 'Student Dashboard', 
            announcements,
            attendancePercentage,
            nextDueInvoice,
            lastPayment
        });
    } catch (err) {
        next(err);
    }
});

// [SSR] GET /student/attendance
router.get('/attendance', async (req, res, next) => {
    try {
        const { from_date, to_date } = req.query;
        const studentProfile = await knex('students').where({ user_id: req.session.user.id }).first();
        if (!studentProfile) {
            return next(new Error('Student profile not found.'));
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

        res.render('pages/student/attendance', {
            title: 'My Attendance',
            attendance,
            from_date,
            to_date
        });

    } catch (err) {
        next(err);
    }
});

// [API] GET /student/attendance/export
router.get('/attendance/export', attendanceController.exportCSV);

// [SSR] GET /student/payments
router.get('/payments', async (req, res, next) => {
    try {
        const studentProfile = await knex('students').where({ user_id: req.session.user.id }).first();
        if (!studentProfile) {
            return next(new Error('Student profile not found.'));
        }

        const invoices = await knex('invoices')
            .leftJoin('payments', 'invoices.id', 'payments.invoice_id')
            .join('batches', 'invoices.batch_id', 'batches.id')
            .where({ 'invoices.student_id': studentProfile.id })
            .select(
                'invoices.id',
                'invoices.amount_cents',
                'invoices.due_on',
                'invoices.status',
                'batches.name as batch_name',
                'payments.id as payment_id'
            )
            .orderBy('invoices.due_on', 'desc');

        res.render('pages/student/payments', {
            title: 'My Payments',
            invoices
        });

    } catch (err) {
        next(err);
    }
});

// [SSR] GET /student/receipts/:paymentId
router.get('/receipts/:paymentId', receiptController.downloadReceipt);

// Add other student routes here...

module.exports = router;