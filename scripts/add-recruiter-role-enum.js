/**
 * Add RECRUITER to users_role_enum in database
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

async function addRecruiterRole() {
  const dataSource = new DataSource(config);
  
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Check if 'recruiter' already exists in enum
    const enumCheck = await dataSource.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
      AND enumlabel = 'recruiter';
    `);

    if (enumCheck.length > 0) {
      console.log('ℹ️  Role "recruiter" already exists in enum');
    } else {
      // Add 'recruiter' to enum
      await dataSource.query(`
        ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'recruiter';
      `);
      console.log('✅ Added "recruiter" to users_role_enum');
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Role already exists, continuing...');
      await dataSource.destroy();
      process.exit(0);
    }
    await dataSource.destroy();
    process.exit(1);
  }
}

addRecruiterRole();
