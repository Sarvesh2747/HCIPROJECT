/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('webhook_events', function(table) {
    table.increments('id').primary();
    table.string('provider', 100).notNullable();
    table.string('event_type', 255);
    table.string('event_id', 255).notNullable().unique();
    table.json('payload_json').notNullable();
    table.boolean('processed').defaultTo(false);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('webhook_events');
};