const knex = require('knex')(require('../../knexfile').development);
const Razorpay = require('razorpay');
const crypto = require('crypto');
const receiptController = require('./receiptController');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createRazorpayOrder = async (req, res, next) => {
    const { invoice_id } = req.body;

    try {
        const invoice = await knex('invoices').where({ id: invoice_id, status: 'PENDING' }).first();

        if (!invoice) {
            return res.status(404).json({ error: 'Pending invoice not found.' });
        }

        const options = {
            amount: invoice.amount_cents, // amount in the smallest currency unit
            currency: 'INR',
            receipt: `receipt_inv_${invoice.id}`
        };

        const order = await razorpay.orders.create(options);

        // Save the razorpay_order_id to our invoice
        await knex('invoices').where({ id: invoice.id }).update({ razorpay_order_id: order.id });

        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.verifyPayment = async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification details.' });
    }

    try {
        // Step 1: Verify the signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature.' });
        }

        // Step 2: Signature is valid. Find invoice and update database.
        const invoice = await knex('invoices').where({ razorpay_order_id }).first();
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found for this order.' });
        }

        // Step 3: Use a transaction to ensure atomicity
        let newPayment;
        await knex.transaction(async (trx) => {
            // Update invoice status
            await trx('invoices').where({ id: invoice.id }).update({ status: 'PAID' });

            // Create payment record
            const [insertedPayment] = await trx('payments').insert({
                invoice_id: invoice.id,
                student_id: invoice.student_id,
                batch_id: invoice.batch_id,
                amount_cents: invoice.amount_cents,
                currency: 'INR',
                mode: 'ONLINE',
                provider: 'RAZORPAY',
                provider_payment_id: razorpay_payment_id,
                provider_order_id: razorpay_order_id,
                status: 'SUCCESS',
                paid_on: new Date(),
                created_by: invoice.student_id // Or a system user ID
            }).returning('*');
            newPayment = insertedPayment;
        });

        // Step 4: Generate receipt (fire and forget, don't block response)
        if (newPayment) {
            receiptController.generateAndSaveReceipt(newPayment);
        }


    } catch (err) {
        console.error(err);
        next(err);
    }
};

exports.verifyWebhook = async (req, res, next) => {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(400).send('Signature not found.');
    }

    try {
        // Step 1: Validate the webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(req.body)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(400).send('Invalid signature.');
        }

        // Step 2: Signature is valid. Parse payload and log the event.
        const event = JSON.parse(req.body.toString());
        
        await knex('webhook_events').insert({
            provider: 'RAZORPAY',
            event_type: event.event,
            event_id: event.id,
            payload_json: JSON.stringify(event.payload),
            processed: false
        });

        // Step 3: Process the event
        switch (event.event) {
            case 'payment.failed':
                const { order_id } = event.payload.payment.entity;
                await knex('invoices').where({ razorpay_order_id: order_id }).update({ status: 'FAILED' });
                break;
            // Add other event handlers here, e.g., for refunds
            // case 'refund.processed':
            //     // ...
            //     break;
        }

        // Step 4: Mark as processed and acknowledge receipt
        await knex('webhook_events').where({ event_id: event.id }).update({ processed: true });
        res.status(200).json({ status: 'ok' });

    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).send('Webhook processing failed.');
    }
};

