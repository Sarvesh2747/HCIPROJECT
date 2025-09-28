exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

exports.isTeacher = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'TEACHER') {
        return next();
    }
    res.status(403).render('pages/error', { title: 'Forbidden', statusCode: 403, message: 'You do not have permission to view this page.' });
};

exports.isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'STUDENT') {
        return next();
    }
    res.status(403).render('pages/error', { title: 'Forbidden', statusCode: 403, message: 'You do not have permission to view this page.' });
};

exports.redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user) {
        const redirectUrl = req.session.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
        return res.redirect(redirectUrl);
    }
    next();
};
