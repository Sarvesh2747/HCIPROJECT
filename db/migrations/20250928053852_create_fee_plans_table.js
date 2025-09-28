/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('fee_plans', function(table) {
    table.increments('id').primary();
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('batches').onDelete('CASCADE');
    table.integer('amount_cents').unsigned().notNullable();
    table.string('currency', 3).notNullable().defaultTo('INR');
    table.enum('frequency', ['MONTHLY', 'QUARTERLY', 'YEARLY']).notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('fee_plans');
};