const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const knex = require('knex')(require('../../knexfile').development);

// Ensure storage directory exists
const storageDir = path.join(__dirname, '../../storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

exports.generateAndSaveReceipt = async (payment) => {
    try {
        // 1. Fetch necessary details for the receipt
        const student = await knex('users').where({ id: payment.student_id }).first();
        const batch = await knex('batches').where({ id: payment.batch_id }).first();

        // 2. Define receipt details
        const receiptNo = `RCPT-${new Date().getFullYear()}-${payment.id}`;
        const pdfPath = path.join(storageDir, `receipt-${payment.id}.pdf`);

        // 3. Create the PDF document
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        // --- PDF Content ---
        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('HCIPROJECT - PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();

        // Receipt Info
        doc.fontSize(12).font('Helvetica');
        doc.text(`Receipt No: ${receiptNo}`);
        doc.text(`Payment ID: ${payment.provider_payment_id || 'N/A'}`);
        doc.text(`Date: ${new Date(payment.paid_on).toLocaleDateString()}`);
        doc.moveDown();

        // Student Info
        doc.font('Helvetica-Bold').text('Billed To:');
        doc.font('Helvetica').text(student.name);
        doc.text(student.email);
        doc.moveDown();

        // Line items table
        doc.font('Helvetica-Bold').text('Description', 50, doc.y);
        doc.text('Amount', 450, doc.y, { align: 'right' });
        doc.y += 20;
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // HR
        doc.y += 10;
        doc.font('Helvetica').text(`Fees for ${batch.name}`, 50, doc.y);
        doc.text(`Rs. ${(payment.amount_cents / 100).toFixed(2)}`, 450, doc.y, { align: 'right' });
        doc.y += 20;
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // HR
        doc.y += 10;

        // Total
        doc.font('Helvetica-Bold').text('Total Paid', 50, doc.y);
        doc.text(`Rs. ${(payment.amount_cents / 100).toFixed(2)}`, 450, doc.y, { align: 'right' });
        doc.moveDown(2);

        // Payment Method
        doc.font('Helvetica-Bold').text('Payment Method:');
        doc.font('Helvetica').text(`${payment.mode} (${payment.provider})`);
        if (payment.reference_no) {
            doc.text(`Ref: ${payment.reference_no}`);
        }
        doc.moveDown();

        // Footer
        doc.fontSize(10).text('Thank you for your payment!', { align: 'center' });
        // --- End of PDF Content ---

        doc.end();

        // 4. Wait for the stream to finish, then save to DB
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        await knex('receipts').insert({
            payment_id: payment.id,
            receipt_no: receiptNo,
            pdf_path: pdfPath, // Storing absolute path for simplicity
        });

        console.log(`Receipt generated: ${pdfPath}`);

    } catch (err) {
        console.error('Failed to generate receipt:', err);
        // We don't throw here because the payment itself was successful.
        // This failure should be logged for manual intervention.
    }
};

exports.downloadReceipt = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const studentProfile = await knex('students').where({ user_id: req.session.user.id }).first();

        if (!studentProfile) {
            return res.status(403).send('Forbidden: Student profile not found.');
        }

        const receipt = await knex('receipts').where({ payment_id: paymentId }).first();

        if (!receipt) {
            return res.status(404).send('Receipt not found.');
        }

        // Security Check: Ensure the receipt belongs to a payment made by the logged-in student
        const payment = await knex('payments').where({ id: receipt.payment_id, student_id: studentProfile.id }).first();

        if (!payment) {
            return res.status(403).send('Forbidden: You do not have access to this receipt.');
        }

        // Check if file exists before attempting to send
        if (fs.existsSync(receipt.pdf_path)) {
            res.download(receipt.pdf_path, `receipt-${receipt.receipt_no}.pdf`);
        } else {
            res.status(404).send('Receipt file not found on server. Please contact support.');
        }

    } catch (err) {
        next(err);
    }
};
