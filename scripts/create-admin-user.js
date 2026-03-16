
/**
 * Create or upgrade a user to admin on the database (prod or local).
 * Uses same env as app: DATABASE_URL, or DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME.
 *
 * Usage (from repo root):
 *   node scripts/create-admin-user.js --email admin@jobsmato.com --password "YourSecurePass123!"
 *   node scripts/create-admin-user.js --email admin@jobsmato.com --password "..." --first Admin --last User
 *
 * If user exists: role is set to admin and password updated. If not: new admin user is created.
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const client = new Client({ connectionString });
    await client.connect();
    return client;
  }
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'jobsmato_db',
  });
  await client.connect();
  return client;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email') args.email = argv[++i];
    else if (argv[i] === '--password') args.password = argv[++i];
    else if (argv[i] === '--first') args.first = argv[++i];
    else if (argv[i] === '--last') args.last = argv[++i];
  }
  return args;
}

async function run() {
  const { email, password, first, last } = parseArgs(process.argv.slice(2));

  if (!email) {
    console.error('Error: --email is required');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Error: --password is required and must be at least 8 characters');
    process.exit(1);
  }

  const client = await getClient();
  try {
    const hashed = await bcrypt.hash(password, 12);
    const firstName = (first || 'Admin').trim();
    const lastName = (last || '').trim();

    const existing = await client.query(
      `SELECT id, email, "firstName", "lastName", role FROM users WHERE email = $1`,
      [email],
    );

    if (existing.rows[0]) {
      await client.query(
        `UPDATE users SET
          role = 'admin',
          status = 'active',
          "firstName" = $1,
          "lastName" = $2,
          password = $3,
          "emailVerified" = true,
          "onboardingComplete" = true,
          "isActive" = true,
          "updatedAt" = CURRENT_TIMESTAMP
         WHERE email = $4`,
        [firstName, lastName, hashed, email],
      );
      console.log('Updated existing user to admin:', {
        id: existing.rows[0].id,
        email,
        firstName,
        lastName,
        role: 'admin',
      });
    } else {
      const insert = await client.query(
        `INSERT INTO users (
          email, password, "firstName", "lastName", role, status,
          "isActive", "emailVerified", "onboardingComplete", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, 'admin', 'active', true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, "firstName", "lastName", role`,
        [email, hashed, firstName, lastName],
      );
      const row = insert.rows[0];
      console.log('Created admin user:', {
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
      });
    }
    console.log('Done. You can log in to the admin panel with the email and password above.');
  } catch (err) {
    console.error('Failed to create/update admin:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
