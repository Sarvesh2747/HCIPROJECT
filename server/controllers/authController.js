const bcrypt = require('bcryptjs');
const knex = require('knex')(require('../../knexfile').development);

exports.register = async (req, res, next) => {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
        return res.status(400).render('pages/register', { 
            title: 'Register', 
            error: 'All fields are required.' 
        });
    }

    try {
        const existingUser = await knex('users').where({ email }).first();
        if (existingUser) {
            return res.status(409).render('pages/register', { 
                title: 'Register', 
                error: 'An account with this email already exists.' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await knex.transaction(async (trx) => {
            const [newUser] = await trx('users').insert({
                name,
                email,
                password_hash: hashedPassword,
                role,
                status: 'ACTIVE'
            }).returning('id');
            
            const newUserId = newUser.id || newUser;

            if (role === 'TEACHER') {
                await trx('teachers').insert({ user_id: newUserId });
            } else {
                await trx('students').insert({ user_id: newUserId });
            }
        });

        // For now, redirect to login. Session handling will be next.
        res.redirect('/auth/login');

    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('pages/login', {
            title: 'Login',
            error: 'Email and password are required.'
        });
    }

    try {
        const user = await knex('users').where({ email }).first();
        if (!user) {
            return res.status(401).render('pages/login', {
                title: 'Login',
                error: 'Invalid credentials.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).render('pages/login', {
                title: 'Login',
                error: 'Invalid credentials.'
            });
        }

        // Store user in session
        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        const redirectUrl = user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
        res.redirect(redirectUrl);

    } catch (err) {
        next(err);
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/'); // Or handle error appropriately
        }
        res.clearCookie('connect.sid'); // The default session cookie name
        res.redirect('/auth/login');
    });
};
