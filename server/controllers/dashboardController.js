exports.redirect = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const { role } = req.session.user;
    if (role === 'TEACHER') {
        res.redirect('/teacher/dashboard');
    } else if (role === 'STUDENT') {
        res.redirect('/student/dashboard');
    } else {
        // Fallback in case of an invalid role in session
        res.redirect('/auth/login');
    }
};
