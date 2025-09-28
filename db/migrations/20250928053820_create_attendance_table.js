/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('attendance', function(table) {
    table.increments('id').primary();
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('batches').onDelete('CASCADE');
    table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.date('date').notNullable();
    table.enum('status', ['PRESENT', 'ABSENT']).notNullable();
    table.integer('marked_by').unsigned().notNullable().references('id').inTable('users');
    table.text('note');
    table.timestamps(true, true);
    table.unique(['batch_id', 'student_id', 'date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('attendance');
};