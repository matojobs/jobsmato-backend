const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobsmato_db',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function resetPassword() {
  try {
    const testPassword = 'Test@123456';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    const res = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, "firstName"',
      [hashedPassword, 'sak4717@gmail.com']
    );
    
    if (res.rows.length > 0) {
      console.log('✓ Password reset successful!');
      console.log(`  Email: ${res.rows[0].email}`);
      console.log(`  Name: ${res.rows[0].firstName}`);
      console.log(`  New password: ${testPassword}`);
    } else {
      console.log('User not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetPassword();
