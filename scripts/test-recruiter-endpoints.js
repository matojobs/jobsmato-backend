/**
 * Test Recruiter Module Endpoints
 * Verifies field names match frontend spec exactly
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const EMAIL = 'recruiter@test.com';
const PASSWORD = 'recruiter123';

let jwtToken = '';

// Helper to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      options.headers['Content-Length'] = JSON.stringify(data).length;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
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

async function testEndpoints() {
  console.log('🧪 Testing Recruiter Module Endpoints\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login to get JWT token
    console.log('\n1️⃣  LOGIN');
    console.log('-'.repeat(60));
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });

    if (loginResponse.status !== 200 && loginResponse.status !== 201) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.data);
      process.exit(1);
    }

    jwtToken = loginResponse.data.accessToken || loginResponse.data.access_token || loginResponse.data.token;
    if (!jwtToken) {
      console.error('❌ No token in response:', JSON.stringify(loginResponse.data, null, 2));
      process.exit(1);
    }

    console.log('✅ Login successful');
    console.log(`   Token: ${jwtToken.substring(0, 20)}...`);

    // Step 2: Test Master Data Endpoints
    console.log('\n2️⃣  MASTER DATA ENDPOINTS');
    console.log('-'.repeat(60));

    // Get recruiters
    const recruitersResponse = await makeRequest('GET', '/api/recruiters', null, jwtToken);
    console.log(`GET /api/recruiters: ${recruitersResponse.status}`);
    if (recruitersResponse.status === 200 && Array.isArray(recruitersResponse.data)) {
      console.log(`   ✅ Found ${recruitersResponse.data.length} recruiters`);
      if (recruitersResponse.data.length > 0) {
        const recruiter = recruitersResponse.data[0];
        console.log(`   ✅ Field names: ${Object.keys(recruiter).join(', ')}`);
        // Verify snake_case
        const hasSnakeCase = Object.keys(recruiter).some(k => k.includes('_'));
        console.log(`   ${hasSnakeCase ? '✅' : '❌'} Uses snake_case: ${hasSnakeCase}`);
      }
    }

    // Get companies
    const companiesResponse = await makeRequest('GET', '/api/companies', null, jwtToken);
    console.log(`GET /api/companies: ${companiesResponse.status}`);
    if (companiesResponse.status === 200) {
      console.log(`   ✅ Companies endpoint working`);
    }

    // Get job roles
    const jobRolesResponse = await makeRequest('GET', '/api/job-roles', null, jwtToken);
    console.log(`GET /api/job-roles: ${jobRolesResponse.status}`);
    if (jobRolesResponse.status === 200) {
      console.log(`   ✅ Job roles endpoint working`);
    }

    // Get candidates
    const candidatesResponse = await makeRequest('GET', '/api/candidates', null, jwtToken);
    console.log(`GET /api/candidates: ${candidatesResponse.status}`);
    if (candidatesResponse.status === 200) {
      console.log(`   ✅ Candidates endpoint working`);
    }

    // Step 3: Test Applications Endpoints
    console.log('\n3️⃣  APPLICATIONS ENDPOINTS');
    console.log('-'.repeat(60));

    // Get applications
    const applicationsResponse = await makeRequest('GET', '/api/applications?page=1&limit=5', null, jwtToken);
    console.log(`GET /api/applications: ${applicationsResponse.status}`);
    if (applicationsResponse.status === 200) {
      const apps = applicationsResponse.data.data || applicationsResponse.data;
      console.log(`   ✅ Found ${Array.isArray(apps) ? apps.length : 0} applications`);
      
      if (Array.isArray(apps) && apps.length > 0) {
        const app = apps[0];
        console.log(`\n   📋 Field Names Verification:`);
        const fields = Object.keys(app);
        const expectedFields = [
          'id',
          'candidate_id',
          'recruiter_id',
          'job_role_id',
          'assigned_date',
          'call_date',
          'call_status',
          'interested_status',
          'selection_status',
          'joining_status',
          'notes',
          'created_at',
          'updated_at',
        ];
        
        expectedFields.forEach(field => {
          const exists = fields.includes(field);
          console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTS' : 'MISSING'}`);
        });

        // Check for camelCase (should NOT exist)
        const hasCamelCase = fields.some(f => /[A-Z]/.test(f));
        console.log(`\n   ${!hasCamelCase ? '✅' : '❌'} No camelCase fields: ${!hasCamelCase}`);
        if (hasCamelCase) {
          const camelFields = fields.filter(f => /[A-Z]/.test(f));
          console.log(`   ⚠️  Found camelCase: ${camelFields.join(', ')}`);
        }

        // Verify status fields are strings, not numbers
        if (app.call_status !== undefined) {
          const isString = typeof app.call_status === 'string' || app.call_status === null;
          console.log(`   ${isString ? '✅' : '❌'} call_status is string: ${isString} (value: ${app.call_status})`);
        }
        if (app.interested_status !== undefined) {
          const isString = typeof app.interested_status === 'string' || app.interested_status === null;
          console.log(`   ${isString ? '✅' : '❌'} interested_status is string: ${isString} (value: ${app.interested_status})`);
        }
      }
    }

    // Step 4: Test Dashboard Endpoints
    console.log('\n4️⃣  DASHBOARD ENDPOINTS');
    console.log('-'.repeat(60));

    // Get dashboard stats
    const statsResponse = await makeRequest('GET', '/api/dashboard/stats', null, jwtToken);
    console.log(`GET /api/dashboard/stats: ${statsResponse.status}`);
    if (statsResponse.status === 200) {
      console.log(`   ✅ Dashboard stats endpoint working`);
      const stats = statsResponse.data;
      if (stats) {
        console.log(`   📊 Field names: ${Object.keys(stats).join(', ')}`);
        // Verify snake_case
        const hasSnakeCase = Object.keys(stats).some(k => k.includes('_'));
        console.log(`   ${hasSnakeCase ? '✅' : '❌'} Uses snake_case: ${hasSnakeCase}`);
      }
    }

    // Get pipeline
    const pipelineResponse = await makeRequest('GET', '/api/dashboard/pipeline', null, jwtToken);
    console.log(`GET /api/dashboard/pipeline: ${pipelineResponse.status}`);
    if (pipelineResponse.status === 200) {
      console.log(`   ✅ Pipeline endpoint working`);
    }

    // Step 5: Test Create Application (if we have candidate and job_role)
    console.log('\n5️⃣  CREATE APPLICATION TEST');
    console.log('-'.repeat(60));

    // Get first candidate and job role
    const testCandidates = candidatesResponse.data || [];
    const testJobRoles = jobRolesResponse.data || [];

    if (testCandidates.length > 0 && testJobRoles.length > 0) {
      const candidateId = testCandidates[0].id;
      const jobRoleId = testJobRoles[0].id;

      const createAppPayload = {
        candidate_id: candidateId,
        job_role_id: jobRoleId,
        assigned_date: new Date().toISOString().split('T')[0],
        call_status: 'Connected',
        interested_status: 'Yes',
        selection_status: 'Selected',
        joining_status: 'Pending',
        notes: 'Test application from automated test',
      };

      console.log(`   Creating application with payload:`);
      console.log(`   ${JSON.stringify(createAppPayload, null, 2)}`);

      const createResponse = await makeRequest('POST', '/api/applications', createAppPayload, jwtToken);
      console.log(`POST /api/applications: ${createResponse.status}`);

      if (createResponse.status === 201) {
        console.log(`   ✅ Application created successfully`);
        const createdApp = createResponse.data;
        
        console.log(`\n   📋 Response Field Names:`);
        Object.keys(createdApp).forEach(key => {
          console.log(`   ✅ ${key}`);
        });

        // Verify status fields are strings
        console.log(`\n   📊 Status Field Values:`);
        console.log(`   call_status: "${createdApp.call_status}" (type: ${typeof createdApp.call_status})`);
        console.log(`   interested_status: "${createdApp.interested_status}" (type: ${typeof createdApp.interested_status})`);
        console.log(`   selection_status: "${createdApp.selection_status}" (type: ${typeof createdApp.selection_status})`);
        console.log(`   joining_status: "${createdApp.joining_status}" (type: ${typeof createdApp.joining_status})`);

        const allStrings = [
          createdApp.call_status === null || typeof createdApp.call_status === 'string',
          createdApp.interested_status === null || typeof createdApp.interested_status === 'string',
          createdApp.selection_status === null || typeof createdApp.selection_status === 'string',
          createdApp.joining_status === null || typeof createdApp.joining_status === 'string',
        ].every(Boolean);

        console.log(`\n   ${allStrings ? '✅' : '❌'} All status fields are strings (not integers): ${allStrings}`);
      } else {
        console.log(`   ⚠️  Create failed: ${createResponse.status}`);
        console.log(`   Response: ${JSON.stringify(createResponse.data, null, 2)}`);
      }
    } else {
      console.log(`   ⚠️  Skipping create test (need candidates and job roles)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Endpoint testing complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEndpoints();
