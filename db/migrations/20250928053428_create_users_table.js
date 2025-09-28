/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.enum('role', ['TEACHER', 'STUDENT']).notNullable();
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('phone', 20);
    table.string('password_hash', 255).notNullable();
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};