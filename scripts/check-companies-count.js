/**
 * Check how many companies exist in the database
 */
const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
};

async function checkCompanies() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get total count
    const countResult = await client.query('SELECT COUNT(*) as total FROM companies');
    const total = parseInt(countResult.rows[0].total);

    console.log(`📊 Total Companies: ${total}\n`);

    if (total > 0) {
      // Get all companies with details
      const companiesResult = await client.query(`
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.industry,
          COUNT(jr.id) as job_roles_count
        FROM companies c
        LEFT JOIN sourcing.job_roles jr ON jr.company_id = c.id AND jr.is_active = true
        GROUP BY c.id, c.name, c.slug, c.industry
        ORDER BY c.name ASC
      `);

      console.log('Company Details:');
      console.log('─'.repeat(80));
      companiesResult.rows.forEach((company, index) => {
        console.log(`${index + 1}. ID: ${company.id} | Name: "${company.name}"`);
        console.log(`   Slug: ${company.slug || 'N/A'} | Industry: ${company.industry || 'N/A'} | Job Roles: ${company.job_roles_count}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No companies found in the database.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('\nTip: Set DB credentials:');
      console.error('   $env:DB_USERNAME="postgres"; $env:DB_PASSWORD="password"; node check-companies-count.js');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkCompanies();
