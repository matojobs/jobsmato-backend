/**
 * Fix: "password authentication failed for user jobsmato_user"
 * Creates or resets jobsmato_user with password 'password' using postgres superuser.
 *
 * Usage:
 *   Set env for postgres user: DB_USERNAME=postgres DB_PASSWORD=password node fix-db-connection.js
 *   Or with Docker: docker exec -e DB_HOST=localhost jobsmato_postgres_local node ... (not needed; run from host)
 *
 * Better: run from host with postgres credentials in env:
 *   $env:DB_USERNAME="postgres"; $env:DB_PASSWORD="password"; node fix-db-connection.js
 */
const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
};

async function fix() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('Connected as postgres. Creating/updating jobsmato_user...\n');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jobsmato_user') THEN
          CREATE ROLE jobsmato_user WITH LOGIN PASSWORD 'password';
          RAISE NOTICE 'Created user jobsmato_user with password: password';
        ELSE
          ALTER ROLE jobsmato_user WITH PASSWORD 'password';
          RAISE NOTICE 'Updated password for jobsmato_user to: password';
        END IF;
      END $$;
    `);

    await client.query('GRANT ALL PRIVILEGES ON DATABASE jobsmato_db TO jobsmato_user;');
    await client.query('GRANT ALL ON SCHEMA public TO jobsmato_user;');
    await client.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jobsmato_user;');
    await client.query('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jobsmato_user;');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jobsmato_user;');

    // If sourcing schema exists (recruiter/datalake)
    const schemas = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'sourcing'");
    if (schemas.rows.length > 0) {
      await client.query('GRANT USAGE ON SCHEMA sourcing TO jobsmato_user;');
      await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sourcing TO jobsmato_user;');
      await client.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sourcing TO jobsmato_user;');
      console.log('Granted permissions on schema sourcing.');
    }

    console.log('\n✅ Done. In your .env use:');
    console.log('   DB_USERNAME=jobsmato_user');
    console.log('   DB_PASSWORD=password');
    console.log('\nThen restart the backend (npx nest start).');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('\nTip: Connect as postgres. From project root run:');
      console.error('   $env:DB_USERNAME="postgres"; $env:DB_PASSWORD="password"; node fix-db-connection.js');
      console.error('Or if using Docker default: postgres/password');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

fix();
