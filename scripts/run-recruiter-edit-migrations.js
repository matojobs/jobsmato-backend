/**
 * Run only the recruiter Edit Candidate migrations (0028 sourcing, 0029 job_applications).
 * Use when the main migrations table is out of sync but DB already has older schema.
 *
 *   node -r dotenv/config scripts/run-recruiter-edit-migrations.js
 *
 * Env: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME (or .env)
 */
const { DataSource } = require('typeorm');
const path = require('path');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'jobsmato_password',
  database: process.env.DB_NAME || 'jobsmato_db',
  migrations: [
    path.join(__dirname, '../dist/src/migrations/1700000000028-AddRecruiterEditFieldsToSourcingApplications.js'),
    path.join(__dirname, '../dist/src/migrations/1700000000029-AddRecruiterEditFieldsToJobApplications.js'),
  ],
  migrationsRun: false,
  synchronize: false,
  logging: true,
};

(async () => {
  try {
    const dataSource = new DataSource(config);
    await dataSource.initialize();
    console.log('✅ Connected to database');
    const migrations = await dataSource.runMigrations();
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migration(s):`);
      migrations.forEach((m) => console.log(`   - ${m.name}`));
    } else {
      console.log('ℹ️  No pending recruiter-edit migrations (0028, 0029)');
    }
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
