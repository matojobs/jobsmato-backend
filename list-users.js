const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobsmato_db',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function listUsers() {
  try {
    const res = await pool.query(`
      SELECT id, email, "firstName", "lastName", role, status
      FROM users
      WHERE role = 'intern'
      LIMIT 10
    `);
    
    console.log('Interns in database:');
    res.rows.forEach(row => {
      console.log(`${row.id}. ${row.firstName} ${row.lastName} - ${row.email} (${row.status})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listUsers();
