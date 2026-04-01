#!/usr/bin/env node
/**
 * Proper fix for prod when sourcing schema/tables are missing.
 *
 * Prod's migrations table was previously seeded with all migration names, so
 * TypeORM never ran 1700000000020 (CreateSourcingDataLake) and 1700000000021
 * (ImproveSourcingDataLake). This script:
 * 1. Removes those two records from the migrations table so they become "pending".
 * 2. Runs only the sourcing migrations (CreateSourcingDataLake + ImproveSourcingDataLake).
 *
 * After this, the full sourcing schema exists (recruiters, portals, job_roles,
 * candidates, applications, functions, etc.) and admin create-recruiter and
 * recruiter portal work.
 *
 * Usage (on prod server, from repo root, with build present):
 *   docker exec jobsmato_api node scripts/fix-prod-sourcing-migrations.js
 *
 * Or locally against a DB that has the same "seeded migrations" issue:
 *   DB_HOST=localhost DB_PASSWORD=... node scripts/fix-prod-sourcing-migrations.js
 *   (Ensure dist/src/migrations/*.js exist: npm run build first.)
 *
 * Env: Same as run-migrations.js — DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME.
 */

const { DataSource } = require('typeorm');
const { spawn } = require('child_process');
const path = require('path');

const SOURCING_TIMESTAMPS = [1700000000020, 1700000000021];

const dbConfig = {
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'jobsmato_password',
  database: process.env.DB_NAME || 'jobsmato_db',
  logging: false,
};

async function main() {
  const ds = new DataSource(dbConfig);
  try {
    await ds.initialize();
    console.log('Connected to database.');

    const [existsRow] = await ds.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'sourcing' AND table_name = 'recruiters' LIMIT 1`,
    );
    if (existsRow) {
      console.log('sourcing.recruiters already exists. Nothing to do.');
      await ds.destroy();
      process.exit(0);
      return;
    }

    await ds.query(
      `DELETE FROM migrations WHERE timestamp = ANY($1::bigint[])`,
      [SOURCING_TIMESTAMPS],
    );
    console.log('Removed sourcing migration records from migrations table (so they run as pending).');

    await ds.destroy();

    console.log('Running sourcing migrations...');
    const scriptPath = path.join(__dirname, 'run-sourcing-migrations.js');
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DB_HOST: process.env.DB_HOST || 'postgres' },
    });
    child.on('close', (code) => process.exit(code ?? 0));
  } catch (err) {
    console.error('Error:', err.message);
    await ds.destroy().catch(() => {});
    process.exit(1);
  }
}

main();
