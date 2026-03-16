/**
 * Check and fix user isActive status
 */
const { DataSource } = require('typeorm');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
  logging: false,
};

async function checkUser() {
  const dataSource = new DataSource(config);
  
  try {
    await dataSource.initialize();
    
    const user = await dataSource.query(
      `SELECT id, email, role, "isActive" FROM users WHERE email = $1`,
      ['recruiter@test.com'],
    );
    
    console.log('Current user:', user[0]);
    
    if (user.length > 0 && !user[0].isActive) {
      await dataSource.query(
        `UPDATE users SET "isActive" = true WHERE email = $1`,
        ['recruiter@test.com'],
      );
      console.log('✅ Set isActive = true');
    } else if (user.length > 0 && user[0].isActive) {
      console.log('✅ User is already active');
    }
    
    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkUser();
