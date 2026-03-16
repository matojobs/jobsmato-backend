/**
 * Create application directly in database to test performance endpoint
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

async function createApplicationDirect() {
  const dataSource = new DataSource(config);
  
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Get recruiter ID
    const recruiter = await dataSource.query(
      `SELECT id FROM sourcing.recruiters WHERE email = $1`,
      ['recruiter@test.com'],
    );
    
    if (recruiter.length === 0) {
      console.error('❌ Recruiter not found');
      process.exit(1);
    }
    
    const recruiterId = recruiter[0].id;
    console.log(`✅ Found recruiter ID: ${recruiterId}`);

    // Get candidate ID
    const candidate = await dataSource.query(
      `SELECT id FROM sourcing.candidates LIMIT 1`,
    );
    
    if (candidate.length === 0) {
      console.error('❌ No candidates found');
      process.exit(1);
    }
    
    const candidateId = candidate[0].id;
    console.log(`✅ Using candidate ID: ${candidateId}`);

    // Get job role ID
    const jobRole = await dataSource.query(
      `SELECT id FROM sourcing.job_roles LIMIT 1`,
    );
    
    if (jobRole.length === 0) {
      console.error('❌ No job roles found');
      process.exit(1);
    }
    
    const jobRoleId = jobRole[0].id;
    console.log(`✅ Using job role ID: ${jobRoleId}`);

    // Check if application already exists
    const existing = await dataSource.query(
      `SELECT id FROM sourcing.applications 
       WHERE candidate_id = $1 AND job_role_id = $2 AND assigned_date = CURRENT_DATE`,
      [candidateId, jobRoleId],
    );

    if (existing.length > 0) {
      console.log(`✅ Application already exists (ID: ${existing[0].id})`);
      await dataSource.destroy();
      process.exit(0);
    }

    // Create application
    const today = new Date().toISOString().split('T')[0];
    const result = await dataSource.query(
      `INSERT INTO sourcing.applications (
        candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
        call_status, interested, selection_status, joining_status, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::DATE, $4::DATE,
        sourcing.map_call_status($5),
        sourcing.map_interested($6),
        sourcing.map_selection_status($7),
        sourcing.map_joining_status($8),
        $9,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id`,
      [candidateId, recruiterId, jobRoleId, today, 'Connected', 'Yes', 'Selected', 'Pending', 'Test application created directly'],
    );

    console.log(`✅ Created application ID: ${result[0].id}`);
    console.log('\n✅ Application created successfully!');
    console.log('   Now test: GET /api/reports/recruiter-performance');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await dataSource.destroy();
    process.exit(1);
  }
}

createApplicationDirect();
