/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('payments', function(table) {
    table.increments('id').primary();
    table.integer('invoice_id').unsigned().notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('batches').onDelete('CASCADE');
    table.integer('amount_cents').unsigned().notNullable();
    table.string('currency', 3).notNullable().defaultTo('INR');
    table.enum('mode', ['ONLINE', 'CASH', 'UPI', 'CHEQUE']).notNullable();
    table.enum('provider', ['RAZORPAY', 'MANUAL']).notNullable();
    table.string('provider_payment_id');
    table.string('provider_order_id');
    table.enum('status', ['SUCCESS', 'FAILED', 'PENDING']).notNullable();
    table.dateTime('paid_on');
    table.string('reference_no');
    table.integer('created_by').unsigned().references('id').inTable('users');
    table.text('notes');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('payments');
};