const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobsmato_db',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkUser() {
  try {
    // Check users table schema
    const schemaRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      LIMIT 20
    `);
    console.log('Users table columns:');
    schemaRes.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    
    // Find user
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', ['sumitkg4245@gmail.com']);
    
    if (userRes.rows.length === 0) {
      console.log('\n❌ User not found: sumitkg4245@gmail.com');
    } else {
      console.log('\n✓ User found:');
      console.log(JSON.stringify(userRes.rows[0], null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUser();
