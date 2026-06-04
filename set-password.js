const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobsmato_db',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function setPassword() {
  try {
    const password = '123456798';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const res = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING email, "firstName"',
      [hashedPassword, 'sak4717@gmail.com']
    );
    
    if (res.rows.length > 0) {
      console.log(`✓ Password set for ${res.rows[0].firstName} (${res.rows[0].email})`);
      console.log(`  Password: 123456798`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setPassword();
