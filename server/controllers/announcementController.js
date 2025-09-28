const knex = require('knex')(require('../../knexfile').development);

exports.create = async (req, res, next) => {
    const { title, body, batch_id } = req.body;
    const created_by = req.session.user.id;

    if (!title || !body || !batch_id) {
        // In a real app, you'd render the page again with an error
        return res.status(400).send('Title, body, and batch are required.');
    }

    try {
        await knex('announcements').insert({
            title,
            body,
            batch_id,
            created_by
        });
        res.redirect('/teacher/dashboard');
    } catch (err) {
        next(err);
    }
};
