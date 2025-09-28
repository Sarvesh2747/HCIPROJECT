/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('enrollments', function(table) {
    table.increments('id').primary();
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('batches').onDelete('CASCADE');
    table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.date('joined_on');
    table.boolean('active').defaultTo(true);
    table.unique(['batch_id', 'student_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('enrollments');
};