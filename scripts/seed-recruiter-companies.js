/**
 * Seed 10 example companies with job roles for recruiter frontend testing.
 * Each company needs its own user (OneToOne: one user = one company).
 * Run: node seed-recruiter-companies.js
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
};

const EXAMPLE_COMPANIES = [
  { name: 'TechFlow Solutions', industry: 'Technology', description: 'Software and cloud solutions.', website: 'https://techflow.io' },
  { name: 'Green Energy Corp', industry: 'Energy', description: 'Renewable energy and sustainability.', website: 'https://greenenergy.com' },
  { name: 'MedCare Plus', industry: 'Healthcare', description: 'Healthcare technology and services.', website: 'https://medcareplus.com' },
  { name: 'FinanceHub', industry: 'Finance', description: 'Fintech and banking solutions.', website: 'https://financehub.com' },
  { name: 'RetailMax', industry: 'Retail', description: 'E-commerce and retail technology.', website: 'https://retailmax.com' },
  { name: 'EduLearn', industry: 'Education', description: 'EdTech and online learning.', website: 'https://edulearn.com' },
  { name: 'LogiMove', industry: 'Logistics', description: 'Supply chain and logistics.', website: 'https://logimove.com' },
  { name: 'BuildRight', industry: 'Construction', description: 'Construction and infrastructure.', website: 'https://buildright.com' },
  { name: 'FoodFresh', industry: 'Food & Beverage', description: 'F&B and food tech.', website: 'https://foodfresh.com' },
  { name: 'MediaStream', industry: 'Media', description: 'Digital media and content.', website: 'https://mediastream.com' },
];

const JOB_ROLES_TEMPLATE = [
  { role_name: 'Software Engineer', department: 'Engineering' },
  { role_name: 'Product Manager', department: 'Product' },
  { role_name: 'Data Analyst', department: 'Analytics' },
  { role_name: 'UX Designer', department: 'Design' },
  { role_name: 'Sales Representative', department: 'Sales' },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seed() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const baseSlug = 'recruiter-test-' + Date.now();
    const hashedPassword = await bcrypt.hash('password123', 10);
    let created = 0;
    let rolesCreated = 0;

    for (let i = 0; i < EXAMPLE_COMPANIES.length; i++) {
      const c = EXAMPLE_COMPANIES[i];
      const slug = `${slugify(c.name)}-${baseSlug}-${i + 1}`;
      const email = `seed-company-${i + 1}-${Date.now()}@recruiter-test.com`;

      // One company per user (OneToOne relation)
      const userResult = await client.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'employer', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [email, hashedPassword, c.name.split(' ')[0], 'Seed']
      );
      const userId = userResult.rows[0].id;

      const companyResult = await client.query(
        `INSERT INTO companies (
          name, slug, description, website, industry, "userId",
          "adminStatus", "isVerified", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'approved', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [c.name, slug, c.description || null, c.website || null, c.industry || null, userId]
      );
      const companyId = companyResult.rows[0].id;
      created++;

      const numRoles = 2 + (i % 3);
      for (let r = 0; r < numRoles; r++) {
        const role = JOB_ROLES_TEMPLATE[r % JOB_ROLES_TEMPLATE.length];
        await client.query(
          `INSERT INTO sourcing.job_roles (company_id, role_name, department, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (company_id, role_name) DO NOTHING`,
          [companyId, role.role_name, role.department || null]
        );
        rolesCreated++;
      }
      console.log(`  ${created}. ${c.name} (ID: ${companyId}) – ${numRoles} job roles`);
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`✅ Done. Created ${created} companies and ${rolesCreated} job roles.`);
    console.log('\nTest from frontend:');
    console.log('  GET /api/recruiter/companies');
    console.log('  GET /api/recruiter/job-roles');
    console.log('  GET /api/recruiter/companies/:id (with job_roles)');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('\nTip: Run with postgres credentials:');
      console.error('  $env:DB_USERNAME="postgres"; $env:DB_PASSWORD="password"; node seed-recruiter-companies.js');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
