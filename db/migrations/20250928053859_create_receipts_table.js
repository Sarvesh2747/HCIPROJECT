/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('receipts', function(table) {
    table.increments('id').primary();
    table.integer('payment_id').unsigned().notNullable().unique().references('id').inTable('payments').onDelete('CASCADE');
    table.string('receipt_no', 255).notNullable().unique();
    table.string('pdf_path', 255).notNullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('receipts');
};