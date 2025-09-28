const knex = require('knex')(require('../../knexfile').development);
const receiptController = require('./receiptController');
const { logAction } = require('../services/auditLogService');

exports.createManual = async (req, res, next) => {
    const { student_id, batch_id, amount, paid_on, mode, reference_no, notes } = req.body;
    const created_by = req.session.user.id;

    // Convert amount to cents
    const amount_cents = Math.round(parseFloat(amount) * 100);

    if (!student_id || !batch_id || isNaN(amount_cents) || !paid_on || !mode) {
        // In a real app, render the form again with an error
        return res.status(400).send('Missing required payment fields.');
    }

    try {
        let newPayment;
        await knex.transaction(async (trx) => {
            // 1. Create an invoice for this manual payment.
            // Since it's paid manually, the invoice is created with status 'PAID'.
            const [invoice] = await trx('invoices').insert({
                student_id,
                batch_id,
                amount_cents,
                currency: 'INR',
                due_on: paid_on, // Due date is the same as paid date for manual entries
                status: 'PAID'
            }).returning('id');
            
            const invoiceId = invoice.id || invoice;

            // 2. Create the payment record linked to the invoice.
            const [insertedPayment] = await trx('payments').insert({
                invoice_id: invoiceId,
                student_id,
                batch_id,
                amount_cents,
                currency: 'INR',
                mode,
                provider: 'MANUAL',
                status: 'SUCCESS',
                paid_on,
                reference_no,
                notes,
                created_by
            }).returning('*');
            newPayment = insertedPayment;
        });

        // 3. Generate receipt (fire and forget)
        if (newPayment) {
            receiptController.generateAndSaveReceipt(newPayment);

            // 4. Log the audit trail for the manual payment creation
            logAction({
                user_id: created_by,
                action: 'CREATE_MANUAL_PAYMENT',
                entity: 'payment',
                entity_id: newPayment.id,
                after_json: newPayment
            });
        }


        // Redirect back with a success flag
        res.redirect('/teacher/payments?success=true');

    } catch (err) {
        next(err);
    }
};
