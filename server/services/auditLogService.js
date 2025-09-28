const knex = require('knex')(require('../../knexfile').development);

/**
 * Logs an action to the audit_logs table.
 * @param {object} details - The details of the action to log.
 * @param {number} details.user_id - The ID of the user performing the action.
 * @param {string} details.action - A description of the action (e.g., 'CREATE_MANUAL_PAYMENT').
 * @param {string} [details.entity] - The type of entity being changed (e.g., 'payment').
 * @param {number} [details.entity_id] - The ID of the entity being changed.
 * @param {object} [details.before_json] - The state of the entity before the change.
 * @param {object} [details.after_json] - The state of the entity after the change.
 */
const logAction = async (details) => {
    try {
        await knex('audit_logs').insert({
            user_id: details.user_id,
            action: details.action,
            entity: details.entity || null,
            entity_id: details.entity_id || null,
            before_json: details.before_json ? JSON.stringify(details.before_json) : null,
            after_json: details.after_json ? JSON.stringify(details.after_json) : null,
        });
    } catch (err) {
        // Log the error to the console, but don't let it crash the main operation.
        console.error('Failed to write to audit log:', err);
    }
};

module.exports = { logAction };
