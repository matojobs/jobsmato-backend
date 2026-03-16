/**
 * Run only the sourcing DataLake migrations
 */
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
  migrations: [
    'dist/src/migrations/1700000000020-CreateSourcingDataLake.js',
    'dist/src/migrations/1700000000021-ImproveSourcingDataLake.js',
  ],
  migrationsRun: false,
  logging: true,
};

async function runMigrations() {
  const dataSource = new DataSource(config);
  
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');
    
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length > 0) {
      console.log(`✅ Executed ${migrations.length} migration(s):`);
      migrations.forEach(m => console.log(`   - ${m.name}`));
    } else {
      console.log('ℹ️  No pending migrations');
    }
    
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runMigrations();
