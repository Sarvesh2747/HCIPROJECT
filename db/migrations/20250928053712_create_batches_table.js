/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('batches', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('subject', 255);
    table.json('schedule_json');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('batches');
};