const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Use a transaction to ensure all or nothing succeeds
  return knex.transaction(async (trx) => {
    // Deletes ALL existing entries in reverse order of dependency
    await trx('enrollments').del();
    await trx('batches').del();
    await trx('students').del();
    await trx('teachers').del();
    await trx('users').del();

    // Hash passwords
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    // Insert users and get their IDs
    const [teacherUser] = await trx('users').insert([
      {
        role: 'TEACHER',
        name: 'Dr. Evelyn Reed',
        email: 'e.reed@example.com',
        phone: '9876543210',
        password_hash: teacherPassword,
        status: 'ACTIVE'
      }
    ]).returning('id');

    const [studentUser] = await trx('users').insert([
      {
        role: 'STUDENT',
        name: 'Alex Ray',
        email: 'a.ray@example.com',
        phone: '1234567890',
        password_hash: studentPassword,
        status: 'ACTIVE'
      }
    ]).returning('id');
    
    const teacherUserId = teacherUser.id || teacherUser;
    const studentUserId = studentUser.id || studentUser;

    // Insert teacher and student profiles
    await trx('teachers').insert([{
      user_id: teacherUserId,
      subjects: 'Physics, Mathematics'
    }]);

    const [studentProfile] = await trx('students').insert([{
      user_id: studentUserId,
      roll_no: 'A101',
      guardian_name: 'John Ray',
      current_class: '12th Grade'
    }]).returning('id');
    
    const studentProfileId = studentProfile.id || studentProfile;

    // Insert a batch
    const [batch] = await trx('batches').insert([{
      name: 'Physics - Grade 12 (2025)',
      subject: 'Physics',
      schedule_json: JSON.stringify({ day: 'Monday', time: '4:00 PM' })
    }]).returning('id');
    
    const batchId = batch.id || batch;

    // Enroll the student in the batch
    await trx('enrollments').insert([{
      batch_id: batchId,
      student_id: studentProfileId,
      joined_on: new Date()
    }]);
  });
};