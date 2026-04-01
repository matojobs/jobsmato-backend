/**
 * Run only the call-status migrations (0030 + 0031) on localhost.
 * Use: node -r dotenv/config scripts/run-call-status-migrations.js
 * Does not modify the migrations table.
 */
require('dotenv').config();
const { DataSource } = require('typeorm');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'jobsmato_password',
  database: process.env.DB_NAME || 'jobsmato_db',
  entities: [],
  migrations: [],
  synchronize: false,
  logging: false,
};

async function run() {
  const ds = new DataSource(config);
  await ds.initialize();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const Migration030 = require('../dist/src/migrations/1700000000030-ExtendSourcingCallStatusOptions.js');
    const Migration031 = require('../dist/src/migrations/1700000000031-FixSourcingPartitionsCallStatusCheck.js');

    const m030 = new Migration030.ExtendSourcingCallStatusOptions1700000000030();
    const m031 = new Migration031.FixSourcingPartitionsCallStatusCheck1700000000031();

    console.log('Running migration 0030 (ExtendSourcingCallStatusOptions)...');
    await m030.up(queryRunner);
    console.log('  OK');

    console.log('Running migration 0031 (FixSourcingPartitionsCallStatusCheck)...');
    try {
      await m031.up(queryRunner);
      console.log('  OK');
    } catch (e) {
      if (e.message && e.message.includes('cannot drop inherited constraint')) {
        console.log('  Skipped (partitions already inherit new constraint from 0030).');
      } else throw e;
    }

    console.log('Done. Call status 1-9 is now allowed on sourcing.applications and partitions.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
  process.exit(0);
}

run();
