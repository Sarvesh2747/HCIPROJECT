/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('announcements', function(table) {
    table.increments('id').primary();
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('batches').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('body').notNullable();
    table.string('attachment_url', 255);
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('announcements');
};