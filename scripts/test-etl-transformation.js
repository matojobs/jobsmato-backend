/**
 * Test ETL Transformation
 * 
 * 1. Create a test company (required for job_roles)
 * 2. Insert 100 test rows into raw_candidate_logs
 * 3. Run ETL transformation
 * 4. Verify applications > 0
 */

const { DataSource } = require('typeorm');
const path = require('path');

const config = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'jobsmato_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
  logging: false,
};

async function testEtlTransformation() {
  const dataSource = new DataSource(config);
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    await dataSource.initialize();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    console.log('🔧 Setting up test environment...\n');
    
    // Step 1: Create a test company if companies table exists
    let companyId = null;
    try {
      const companyCheck = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'companies'
        ) as exists;
      `);
      
      if (companyCheck[0].exists) {
        // Check if any company exists
        const existingCompany = await queryRunner.query(`
          SELECT id FROM companies LIMIT 1;
        `);
        
        if (existingCompany.length > 0) {
          companyId = existingCompany[0].id;
          console.log(`✅ Using existing company ID: ${companyId}`);
        } else {
          // Get or create a user (required for company creation)
          let userId;
          const users = await queryRunner.query(`SELECT id FROM users LIMIT 1;`);
          if (users.length > 0) {
            userId = users[0].id;
            console.log(`   Using existing user ID: ${userId}`);
          } else {
            // Create minimal test user (check required fields)
            const userColumns = await queryRunner.query(`
              SELECT column_name, is_nullable, column_default 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'users'
              ORDER BY ordinal_position;
            `);
            
            // Build minimal user insert
            const requiredFields = [];
            const values = [];
            let paramIndex = 1;
            
            for (const col of userColumns) {
              if (col.is_nullable === 'NO' && !col.column_default) {
                if (col.column_name === 'email') {
                  requiredFields.push('email');
                  values.push('test-etl-' + Date.now() + '@test.com');
                } else if (col.column_name === 'password') {
                  requiredFields.push('password');
                  values.push('$2b$10$dummyhashfordummypassword');
                } else if (col.column_name === 'firstName') {
                  requiredFields.push('"firstName"');
                  values.push('Test');
                } else if (col.column_name === 'lastName') {
                  requiredFields.push('"lastName"');
                  values.push('User');
                } else if (col.column_name === 'createdAt') {
                  requiredFields.push('"createdAt"');
                  values.push('CURRENT_TIMESTAMP');
                } else if (col.column_name === 'updatedAt') {
                  requiredFields.push('"updatedAt"');
                  values.push('CURRENT_TIMESTAMP');
                }
              }
            }
            
            const placeholders = values.map((v, i) => v === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : `$${paramIndex++}`).join(', ');
            const filteredValues = values.filter(v => v !== 'CURRENT_TIMESTAMP');
            
            const newUser = await queryRunner.query(`
              INSERT INTO users (${requiredFields.join(', ')})
              VALUES (${placeholders})
              RETURNING id;
            `, filteredValues);
            userId = newUser[0].id;
            console.log(`   Created test user ID: ${userId}`);
          }
          
          // Create test company
          const slug = 'test-company-etl-' + Date.now();
          const newCompany = await queryRunner.query(`
            INSERT INTO companies (name, slug, "userId", "createdAt", "updatedAt")
            VALUES ('Test ETL Company', $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id;
          `, [slug, userId]);
          companyId = newCompany[0].id;
          console.log(`✅ Created test company ID: ${companyId} (slug: ${slug}, userId: ${userId})`);
        }
      } else {
        console.log('⚠️  Companies table does not exist, will use NULL for job_roles');
      }
    } catch (error) {
      console.log(`⚠️  Could not create company: ${error.message}`);
      console.log('   Will proceed without company (job_roles may fail)');
      // Don't fail the transaction, just continue
      await queryRunner.rollbackTransaction();
      await queryRunner.startTransaction();
    }
    
    // Step 2: Clean up any existing test data
    console.log('\n🧹 Cleaning up existing test data...');
    await queryRunner.query(`DELETE FROM sourcing.applications WHERE candidate_id IN (SELECT id FROM sourcing.candidates WHERE email LIKE 'etl%@test.com');`);
    await queryRunner.query(`DELETE FROM sourcing.candidates WHERE email LIKE 'etl%@test.com';`);
    await queryRunner.query(`DELETE FROM sourcing.raw_candidate_logs WHERE batch_id = 'ETL_TEST_BATCH_100';`);
    console.log('✅ Cleanup complete');
    
    // Step 3: Ensure partition exists
    console.log('\n📦 Ensuring partition exists...');
    try {
      await queryRunner.query(`SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE);`);
      await queryRunner.query(`SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE);`);
      console.log('✅ Partitions ready');
    } catch (error) {
      console.log(`⚠️  Partition creation: ${error.message.includes('already exists') ? 'Already exists' : error.message}`);
    }
    
    // Step 4: Insert 100 test rows (ensure dates fall within current month partition)
    console.log('\n📝 Inserting 100 test rows...');
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const insertResult = await queryRunner.query(`
      INSERT INTO sourcing.raw_candidate_logs (
        batch_id, imported_at, candidate_name, candidate_phone, candidate_email,
        portal_name, job_role, recruiter_name, assigned_date, call_date,
        call_status, interested, selection_status, joining_status, notes
      )
      SELECT 
        'ETL_TEST_BATCH_100',
        CURRENT_DATE - (random() * 5 || ' days')::INTERVAL,
        'ETL Candidate ' || generate_series,
        '9876543' || LPAD((generate_series % 1000)::text, 3, '0'),
        'etl' || generate_series || '@test.com',
        'Portal ' || (generate_series % 10 + 1),
        'Role ' || (generate_series % 20 + 1),
        'Recruiter ' || (generate_series % 5 + 1),
        -- Ensure assigned_date is within current month (for partition)
        date_trunc('month', CURRENT_DATE)::DATE + (random() * EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER || ' days')::INTERVAL,
        date_trunc('month', CURRENT_DATE)::DATE + (random() * EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER || ' days')::INTERVAL,
        CASE (generate_series % 4 + 1)
          WHEN 1 THEN 'BUSY'
          WHEN 2 THEN 'RNR'
          WHEN 3 THEN 'CONNECTED'
          WHEN 4 THEN 'WRONG NUMBER'
        END,
        CASE (generate_series % 3 + 1)
          WHEN 1 THEN 'YES'
          WHEN 2 THEN 'NO'
          WHEN 3 THEN 'CALL BACK LATER'
        END,
        CASE (generate_series % 2 + 1)
          WHEN 1 THEN 'SELECTED'
          WHEN 2 THEN 'NOT SELECTED'
        END,
        CASE (generate_series % 3 + 1)
          WHEN 1 THEN 'JOINED'
          WHEN 2 THEN 'NOT JOINED'
          WHEN 3 THEN 'PENDING'
        END,
        'ETL test notes ' || generate_series
      FROM generate_series(1, 100);
    `);
    console.log(`✅ Inserted ${insertResult.length || 100} rows`);
    
    // Step 5: Get counts before ETL
    const beforeCounts = await queryRunner.query(`
      SELECT 
        (SELECT COUNT(*) FROM sourcing.recruiters) as recruiters,
        (SELECT COUNT(*) FROM sourcing.portals) as portals,
        (SELECT COUNT(*) FROM sourcing.candidates) as candidates,
        (SELECT COUNT(*) FROM sourcing.applications) as applications,
        (SELECT COUNT(*) FROM sourcing.job_roles) as job_roles;
    `);
    console.log('\n📊 Counts BEFORE ETL:');
    console.log(`   Recruiters: ${beforeCounts[0].recruiters}`);
    console.log(`   Portals: ${beforeCounts[0].portals}`);
    console.log(`   Candidates: ${beforeCounts[0].candidates}`);
    console.log(`   Applications: ${beforeCounts[0].applications}`);
    console.log(`   Job Roles: ${beforeCounts[0].job_roles}`);
    
    // Step 6: Run ETL Transformation
    console.log('\n🔄 Running ETL transformation...');
    
    // 6.1: Upsert recruiters
    await queryRunner.query(`
      INSERT INTO sourcing.recruiters (name, email, is_active, created_at, updated_at)
      SELECT DISTINCT 
        recruiter_name as name,
        LOWER(REPLACE(recruiter_name, ' ', '.')) || '@test.com' as email,
        true as is_active,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs
      WHERE batch_id = 'ETL_TEST_BATCH_100'
        AND recruiter_name IS NOT NULL
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('   ✅ Recruiters upserted');
    
    // 6.2: Upsert portals
    await queryRunner.query(`
      INSERT INTO sourcing.portals (name, is_active, created_at)
      SELECT DISTINCT 
        portal_name as name,
        true as is_active,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs
      WHERE batch_id = 'ETL_TEST_BATCH_100'
        AND portal_name IS NOT NULL
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('   ✅ Portals upserted');
    
    // 6.3: Upsert job roles (with company_id if available)
    if (companyId) {
      await queryRunner.query(`
        INSERT INTO sourcing.job_roles (company_id, role_name, is_active, created_at, updated_at)
        SELECT DISTINCT
          $1::INTEGER as company_id,
          job_role as role_name,
          true as is_active,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM sourcing.raw_candidate_logs
        WHERE batch_id = 'ETL_TEST_BATCH_100'
          AND job_role IS NOT NULL
        ON CONFLICT (company_id, role_name) DO NOTHING;
      `, [companyId]);
      console.log(`   ✅ Job roles upserted (company_id: ${companyId})`);
    } else {
      console.log('   ⚠️  Skipping job roles (no company_id available)');
    }
    
    // 6.4: Upsert candidates
    await queryRunner.query(`
      INSERT INTO sourcing.candidates (name, phone, email, portal_id, created_at, updated_at)
      SELECT DISTINCT ON (sourcing.hash_phone(candidate_phone))
        candidate_name as name,
        candidate_phone as phone,
        candidate_email as email,
        (SELECT id FROM sourcing.portals WHERE name = r.portal_name LIMIT 1) as portal_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs r
      WHERE batch_id = 'ETL_TEST_BATCH_100'
        AND candidate_phone IS NOT NULL
      ON CONFLICT (phone_hash) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP;
    `);
    console.log('   ✅ Candidates upserted');
    
    // 6.5: Upsert applications (only if job_roles exist)
    if (companyId) {
      const appResult = await queryRunner.query(`
        INSERT INTO sourcing.applications (
          candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
          call_status, interested, selection_status, joining_status, notes,
          created_at, updated_at
        )
        SELECT
          c.id as candidate_id,
          rec.id as recruiter_id,
          jr.id as job_role_id,
          r.assigned_date,
          r.call_date,
          sourcing.map_call_status(r.call_status) as call_status,
          sourcing.map_interested(r.interested) as interested,
          sourcing.map_selection_status(r.selection_status) as selection_status,
          sourcing.map_joining_status(r.joining_status) as joining_status,
          r.notes,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM sourcing.raw_candidate_logs r
        INNER JOIN sourcing.candidates c ON c.phone_hash = sourcing.hash_phone(r.candidate_phone)
        INNER JOIN sourcing.recruiters rec ON rec.name = r.recruiter_name
        INNER JOIN sourcing.job_roles jr ON jr.role_name = r.job_role AND jr.company_id = $1
        WHERE r.batch_id = 'ETL_TEST_BATCH_100'
          AND r.candidate_phone IS NOT NULL
          AND r.assigned_date IS NOT NULL;
      `, [companyId]);
      console.log(`   ✅ Applications inserted: ${appResult.length || 0} rows`);
    } else {
      console.log('   ⚠️  Skipping applications (no job_roles available)');
    }
    
    await queryRunner.commitTransaction();
    
    // Step 7: Get counts after ETL
    const afterCounts = await queryRunner.query(`
      SELECT 
        (SELECT COUNT(*) FROM sourcing.recruiters) as recruiters,
        (SELECT COUNT(*) FROM sourcing.portals) as portals,
        (SELECT COUNT(*) FROM sourcing.candidates) as candidates,
        (SELECT COUNT(*) FROM sourcing.applications) as applications,
        (SELECT COUNT(*) FROM sourcing.job_roles) as job_roles;
    `);
    
    console.log('\n📊 Counts AFTER ETL:');
    console.log(`   Recruiters: ${afterCounts[0].recruiters} (${afterCounts[0].recruiters - beforeCounts[0].recruiters > 0 ? '+' : ''}${afterCounts[0].recruiters - beforeCounts[0].recruiters})`);
    console.log(`   Portals: ${afterCounts[0].portals} (${afterCounts[0].portals - beforeCounts[0].portals > 0 ? '+' : ''}${afterCounts[0].portals - beforeCounts[0].portals})`);
    console.log(`   Candidates: ${afterCounts[0].candidates} (${afterCounts[0].candidates - beforeCounts[0].candidates > 0 ? '+' : ''}${afterCounts[0].candidates - beforeCounts[0].candidates})`);
    console.log(`   Applications: ${afterCounts[0].applications} (${afterCounts[0].applications - beforeCounts[0].applications > 0 ? '+' : ''}${afterCounts[0].applications - beforeCounts[0].applications})`);
    console.log(`   Job Roles: ${afterCounts[0].job_roles} (${afterCounts[0].job_roles - beforeCounts[0].job_roles > 0 ? '+' : ''}${afterCounts[0].job_roles - beforeCounts[0].job_roles})`);
    
    // Step 8: Verify applications > 0
    console.log('\n✅ VERIFICATION:');
    if (afterCounts[0].applications > beforeCounts[0].applications) {
      console.log(`   ✅ Applications created: ${afterCounts[0].applications - beforeCounts[0].applications} new applications`);
      console.log(`   ✅ Total applications: ${afterCounts[0].applications} > 0`);
    } else {
      console.log(`   ❌ No applications created (${afterCounts[0].applications} total)`);
      if (!companyId) {
        console.log('   💡 Tip: Applications require job_roles, which require a company_id');
      }
    }
    
    // Check for orphaned applications
    const orphaned = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM sourcing.applications a
      LEFT JOIN sourcing.candidates c ON c.id = a.candidate_id
      WHERE c.id IS NULL;
    `);
    console.log(`   Orphaned applications: ${orphaned[0].count}`);
    
    // Check for duplicates
    const duplicates = await queryRunner.query(`
      SELECT candidate_id, recruiter_id, job_role_id, assigned_date, COUNT(*) as count
      FROM sourcing.applications
      GROUP BY candidate_id, recruiter_id, job_role_id, assigned_date
      HAVING COUNT(*) > 1;
    `);
    console.log(`   Duplicate applications: ${duplicates.length}`);
    
    console.log('\n✅ ETL transformation test complete!');
    
    await queryRunner.release();
    await dataSource.destroy();
    
    return {
      success: afterCounts[0].applications > beforeCounts[0].applications,
      beforeCounts: beforeCounts[0],
      afterCounts: afterCounts[0],
      companyId,
    };
    
  } catch (error) {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    await dataSource.destroy();
    console.error('\n❌ ETL transformation failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run test
testEtlTransformation()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 SUCCESS: Applications created successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: No applications were created');
      process.exit(1);
    }
  })
  .catch(error => {
    process.exit(1);
  });
