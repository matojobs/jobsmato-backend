#!/usr/bin/env node
/**
 * Sync job roles for the recruiter portal from the main app's jobs table.
 *
 * The recruiter portal shows job_roles from sourcing.job_roles only. This script
 * inserts distinct (company_id, job title) from the jobs table into sourcing.job_roles
 * so companies with job postings show those as job roles for recruiters.
 *
 * Usage (from repo root):
 *   node scripts/sync-job-roles-from-jobs.js
 *   DB_HOST=localhost node scripts/sync-job-roles-from-jobs.js
 *
 * Env: DATABASE_URL, or DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME (.env).
 */

require('dotenv').config();
const { Client } = require('pg');

function getConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'jobsmato_user',
    password: process.env.DB_PASSWORD || 'jobsmato_password',
    database: process.env.DB_NAME || 'jobsmato_db',
  };
}

async function main() {
  const client = new Client(getConfig());
  await client.connect();

  try {
    // Detect jobs table column name for company (TypeORM often uses "companyId", sometimes company_id)
    const colResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name IN ('companyId', 'company_id')
      LIMIT 1
    `);
    const companyCol = colResult.rows[0]?.column_name || 'companyId';

    const insertResult = await client.query(
      `
      INSERT INTO sourcing.job_roles (company_id, role_name, is_active, created_at, updated_at)
      SELECT DISTINCT
        j."${companyCol}"::integer,
        NULLIF(TRIM(j.title), ''),
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM jobs j
      INNER JOIN companies c ON c.id = j."${companyCol}"
      WHERE j.title IS NOT NULL AND TRIM(j.title) <> ''
      ON CONFLICT (company_id, role_name) DO NOTHING
      `,
    );
    const inserted = insertResult.rowCount ?? 0;

    const countResult = await client.query(
      'SELECT COUNT(*) AS total FROM sourcing.job_roles',
    );
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    console.log(
      'Sync done. Rows added to sourcing.job_roles:',
      inserted,
      '| Total job_roles now:',
      total,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
