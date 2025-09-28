/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('invoices', function(table) {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('batches').onDelete('CASCADE');
    table.integer('fee_plan_id').unsigned().references('id').inTable('fee_plans').onDelete('SET NULL');
    table.integer('amount_cents').unsigned().notNullable();
    table.string('currency', 3).notNullable().defaultTo('INR');
    table.date('due_on').notNullable();
    table.enum('status', ['PENDING', 'PAID', 'FAILED', 'CANCELLED']).notNullable().defaultTo('PENDING');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('invoices');
};