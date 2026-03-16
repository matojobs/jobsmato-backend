/**
 * Setup Recruiter User and Record
 * Creates both user account and recruiter record for testing
 */

const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
  logging: false,
};

async function setupRecruiter() {
  const dataSource = new DataSource(config);
  
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    const email = 'recruiter@test.com';
    const password = 'recruiter123';
    const firstName = 'Test';
    const lastName = 'Recruiter';
    const phone = '+91 9876543210';

    // Check if user already exists
    const existingUser = await dataSource.query(
      `SELECT id, email FROM users WHERE email = $1`,
      [email],
    );

    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`ℹ️  User already exists: ${email} (ID: ${userId})`);
      
      // Update role if needed
      await dataSource.query(
        `UPDATE users SET role = 'recruiter' WHERE id = $1`,
        [userId],
      );
      console.log('✅ Updated user role to recruiter');
    } else {
      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const userResult = await dataSource.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [email, hashedPassword, firstName, lastName, 'recruiter'],
      );
      userId = userResult[0].id;
      console.log(`✅ Created user: ${email} (ID: ${userId})`);
    }

    // Check if recruiter record exists
    const existingRecruiter = await dataSource.query(
      `SELECT id FROM sourcing.recruiters WHERE email = $1`,
      [email],
    );

    let recruiterId;
    if (existingRecruiter.length > 0) {
      recruiterId = existingRecruiter[0].id;
      console.log(`ℹ️  Recruiter record already exists (ID: ${recruiterId})`);
      
      // Update to ensure it's active
      await dataSource.query(
        `UPDATE sourcing.recruiters SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [recruiterId],
      );
      console.log('✅ Updated recruiter record');
    } else {
      // Create recruiter record
      const recruiterResult = await dataSource.query(
        `INSERT INTO sourcing.recruiters (name, email, phone, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [`${firstName} ${lastName}`, email, phone],
      );
      recruiterId = recruiterResult[0].id;
      console.log(`✅ Created recruiter record (ID: ${recruiterId})`);
    }

    console.log('\n📋 Setup Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Recruiter ID: ${recruiterId}`);
    console.log(`   Role: recruiter`);
    console.log('\n✅ Recruiter setup complete!');
    console.log('\n🔑 Use these credentials to login and get JWT token:');
    console.log(`   POST /api/auth/login`);
    console.log(`   { "email": "${email}", "password": "${password}" }`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error.stack);
    await dataSource.destroy();
    process.exit(1);
  }
}

setupRecruiter();
