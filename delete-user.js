const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobsmato_db',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function deleteUser() {
  try {
    // Find user
    const userRes = await pool.query('SELECT id, email, name FROM users WHERE email = $1', ['sumitkg4245@gmail.com']);
    
    if (userRes.rows.length === 0) {
      console.log('User not found: sumitkg4245@gmail.com');
      process.exit(0);
    }
    
    const userId = userRes.rows[0].id;
    const userName = userRes.rows[0].name;
    const userEmail = userRes.rows[0].email;
    
    console.log(`Found user: ${userName} (${userEmail}) - ID: ${userId}`);
    console.log('Deleting related records...');
    
    // Delete from internship_enrollments
    const enrollRes = await pool.query('DELETE FROM internship_enrollments WHERE "userId" = $1', [userId]);
    console.log(`  ✓ Deleted ${enrollRes.rowCount} enrollment(s)`);
    
    // Delete from task_assignments
    const taskRes = await pool.query('DELETE FROM task_assignments WHERE "enrollmentId" IN (SELECT id FROM internship_enrollments WHERE "userId" = $1)', [userId]);
    console.log(`  ✓ Deleted ${taskRes.rowCount} task assignment(s)`);
    
    // Delete from intern_activity_logs
    const actRes = await pool.query('DELETE FROM intern_activity_logs WHERE "candidateId" IN (SELECT id FROM task_assignments WHERE "enrollmentId" IN (SELECT id FROM internship_enrollments WHERE "userId" = $1))', [userId]);
    console.log(`  ✓ Deleted ${actRes.rowCount} activity log(s)`);
    
    // Delete from certificates
    const certRes = await pool.query('DELETE FROM certificates WHERE "enrollmentId" IN (SELECT id FROM internship_enrollments WHERE "userId" = $1)', [userId]);
    console.log(`  ✓ Deleted ${certRes.rowCount} certificate(s)`);
    
    // Delete user
    const delRes = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log(`  ✓ Deleted user account`);
    
    console.log(`\n✅ User ${userName} (${userEmail}) has been completely deleted.`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

deleteUser();
