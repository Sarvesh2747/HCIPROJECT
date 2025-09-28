const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const { redirectIfAuthenticated } = require('../middleware/authMiddleware');

// [SSR] GET /login — Render login screen
router.get('/login', redirectIfAuthenticated, (req, res) => res.render('pages/login', { title: 'Login' }));

// [SSR] GET /register — Render sign-up screen
router.get('/register', redirectIfAuthenticated, (req, res) => res.render('pages/register', { title: 'Register' }));

// [API] POST /auth/register
router.post('/register', authController.register);

// [API] POST /auth/login
router.post('/login', authController.login);

// [API] POST /auth/logout
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

module.exports = router;
