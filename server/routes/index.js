const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Import other routers
const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const teacherRoutes = require('./teacherRoutes');
const billingRoutes = require('./billingRoutes');

// Public route
router.get('/', (req, res) => {
    res.render('pages/index', { title: 'Home' });
});

// Dashboard redirector
router.get('/dashboard', isAuthenticated, dashboardController.redirect);

// Mount other routers
router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/billing', billingRoutes);

module.exports = router;