const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobsmato_db',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function searchUser() {
  try {
    // Search for users with "sumit" in name or email
    const userRes = await pool.query(`
      SELECT id, email, "firstName", "lastName" 
      FROM users 
      WHERE LOWER(email) LIKE '%sumit%' 
         OR LOWER("firstName") LIKE '%sumit%' 
         OR LOWER("lastName") LIKE '%sumit%'
      LIMIT 20
    `);
    
    if (userRes.rows.length === 0) {
      console.log('No users found with "sumit" in their email or name');
    } else {
      console.log('Users matching "sumit":');
      userRes.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.firstName} ${row.lastName || ''} - ${row.email} (ID: ${row.id})`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

searchUser();
