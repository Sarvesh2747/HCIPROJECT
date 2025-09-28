
require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csurf = require('csurf');
const methodOverride = require('method-override');
const allRoutes = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-weak-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'lax'
    }
}));

// CSRF Protection
if (process.env.NODE_ENV !== 'test') {
    app.use(csurf());
    app.use((req, res, next) => {
        res.locals.csrfToken = req.csrfToken();
        next();
    });
}

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user available to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Routes
app.use('/', allRoutes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong on the server!';
    res.status(statusCode).render('pages/error', { 
        title: 'Error',
        statusCode,
        message
    });
});

// Start the server only if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
