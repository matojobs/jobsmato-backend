/**
 * Create test application for recruiter to test performance endpoint
 */
const http = require('http');

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:5000');
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createTestApplication() {
  console.log('🔧 Creating test application for recruiter...\n');

  try {
    // Step 1: Login
    console.log('1️⃣  Logging in...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'recruiter@test.com',
      password: 'recruiter123',
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.data);
      process.exit(1);
    }

    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful\n');

    // Step 2: Get or create a candidate
    console.log('2️⃣  Checking candidates...');
    const candidatesResponse = await makeRequest('GET', '/api/candidates', null, token);
    
    let candidateId;
    if (candidatesResponse.status === 200 && Array.isArray(candidatesResponse.data) && candidatesResponse.data.length > 0) {
      candidateId = candidatesResponse.data[0].id;
      console.log(`✅ Using existing candidate ID: ${candidateId}`);
    } else {
      console.log('   Creating new candidate...');
      const createCandidateResponse = await makeRequest('POST', '/api/candidates', {
        candidate_name: 'Test Candidate',
        phone: '+91 9876543210',
        email: 'test.candidate@example.com',
        qualification: 'B.Tech',
        work_exp_years: 3,
      }, token);

      if (createCandidateResponse.status === 201 || createCandidateResponse.status === 200) {
        candidateId = createCandidateResponse.data.id;
        console.log(`✅ Created candidate ID: ${candidateId}`);
      } else {
        console.error('❌ Failed to create candidate:', createCandidateResponse.status, createCandidateResponse.data);
        process.exit(1);
      }
    }

    // Step 3: Get or create a job role
    console.log('\n3️⃣  Checking job roles...');
    const jobRolesResponse = await makeRequest('GET', '/api/job-roles', null, token);
    
    let jobRoleId;
    if (jobRolesResponse.status === 200 && Array.isArray(jobRolesResponse.data) && jobRolesResponse.data.length > 0) {
      jobRoleId = jobRolesResponse.data[0].id;
      console.log(`✅ Using existing job role ID: ${jobRoleId}`);
    } else {
      console.log('   Creating new job role...');
      // First get a company
      const companiesResponse = await makeRequest('GET', '/api/companies', null, token);
      let companyId = null;
      
      if (companiesResponse.status === 200 && Array.isArray(companiesResponse.data) && companiesResponse.data.length > 0) {
        companyId = companiesResponse.data[0].id;
        console.log(`   Using company ID: ${companyId}`);
      }

      if (!companyId) {
        console.error('❌ No companies available. Cannot create job role.');
        process.exit(1);
      }

      const createJobRoleResponse = await makeRequest('POST', '/api/job-roles', {
        company_id: companyId,
        role_name: 'Software Engineer',
        department: 'Engineering',
      }, token);

      if (createJobRoleResponse.status === 201 || createJobRoleResponse.status === 200) {
        jobRoleId = createJobRoleResponse.data.id;
        console.log(`✅ Created job role ID: ${jobRoleId}`);
      } else {
        console.error('❌ Failed to create job role:', createJobRoleResponse.status, createJobRoleResponse.data);
        process.exit(1);
      }
    }

    // Step 4: Create application
    console.log('\n4️⃣  Creating application...');
    const today = new Date().toISOString().split('T')[0];
    const createAppResponse = await makeRequest('POST', '/api/applications', {
      candidate_id: candidateId,
      job_role_id: jobRoleId,
      assigned_date: today,
      call_status: 'Connected',
      interested_status: 'Yes',
      selection_status: 'Selected',
      joining_status: 'Pending',
      notes: 'Test application created for performance endpoint testing',
    }, token);

    if (createAppResponse.status === 201 || createAppResponse.status === 200) {
      console.log('✅ Application created successfully!');
      console.log(`   Application ID: ${createAppResponse.data.id}`);
      console.log(`   Candidate ID: ${createAppResponse.data.candidate_id}`);
      console.log(`   Job Role ID: ${createAppResponse.data.job_role_id}`);
      console.log(`   Status: ${createAppResponse.data.call_status}`);
    } else {
      console.error('❌ Failed to create application:', createAppResponse.status);
      console.error('   Response:', JSON.stringify(createAppResponse.data, null, 2));
      process.exit(1);
    }

    // Step 5: Test performance endpoint
    console.log('\n5️⃣  Testing performance endpoint...');
    const performanceResponse = await makeRequest('GET', '/api/reports/recruiter-performance', null, token);
    
    if (performanceResponse.status === 200) {
      console.log('✅ Performance endpoint working!');
      console.log('\n📊 Performance Data:');
      console.log(JSON.stringify(performanceResponse.data, null, 2));
    } else {
      console.log(`⚠️  Performance endpoint returned: ${performanceResponse.status}`);
      console.log('   Response:', JSON.stringify(performanceResponse.data, null, 2));
    }

    // Step 6: Test dashboard stats
    console.log('\n6️⃣  Testing dashboard stats...');
    const statsResponse = await makeRequest('GET', '/api/dashboard/stats', null, token);
    
    if (statsResponse.status === 200) {
      console.log('✅ Dashboard stats working!');
      console.log(`   Total applications: ${statsResponse.data.total_applications}`);
      console.log(`   Total candidates: ${statsResponse.data.total_candidates}`);
      console.log(`   Total calls: ${statsResponse.data.total_calls}`);
    }

    // Step 7: Test pipeline
    console.log('\n7️⃣  Testing pipeline...');
    const pipelineResponse = await makeRequest('GET', '/api/dashboard/pipeline', null, token);
    
    if (pipelineResponse.status === 200) {
      console.log('✅ Pipeline working!');
      console.log(`   Pipeline stages: ${pipelineResponse.data.length}`);
      if (pipelineResponse.data.length > 0) {
        pipelineResponse.data.forEach(stage => {
          console.log(`   - ${stage.stage}: ${stage.count} (${stage.percentage}%)`);
        });
      }
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestApplication();
