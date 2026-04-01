/**
 * Complete Recruiter Module Testing Script
 * Tests all endpoints and verifies field names match frontend spec
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const EMAIL = 'recruiter@test.com';
const PASSWORD = 'recruiter123';

let jwtToken = '';

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

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {}, headers: res.headers });
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

function verifySnakeCase(obj, path = '') {
  const issues = [];
  const expectedFields = [
    'candidate_id', 'recruiter_id', 'job_role_id', 'assigned_date', 'call_date',
    'call_status', 'interested_status', 'selection_status', 'joining_status',
    'work_exp_years', 'created_at', 'updated_at', 'candidate_name', 'phone',
    'qualification', 'company_id', 'role_name', 'name', 'email', 'is_active'
  ];

  if (typeof obj !== 'object' || obj === null) return issues;

  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;
    
    // Check for camelCase (should not exist)
    if (/[A-Z]/.test(key) && !expectedFields.includes(key)) {
      issues.push(`❌ Found camelCase field: ${fullPath}`);
    }

    // Check if status fields are strings (not integers)
    if (key.includes('status') || key === 'interested') {
      const value = obj[key];
      if (value !== null && value !== undefined && typeof value !== 'string') {
        issues.push(`❌ Status field ${fullPath} is not a string (type: ${typeof value}, value: ${value})`);
      }
    }

    // Recursively check nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      issues.push(...verifySnakeCase(obj[key], fullPath));
    }

    // Check array items
    if (Array.isArray(obj[key])) {
      obj[key].forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          issues.push(...verifySnakeCase(item, `${fullPath}[${idx}]`));
        }
      });
    }
  }

  return issues;
}

async function testComplete() {
  console.log('🧪 Complete Recruiter Module Testing\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Login
    console.log('\n1️⃣  AUTHENTICATION');
    console.log('-'.repeat(70));
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.data);
      process.exit(1);
    }

    jwtToken = loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   Token: ${jwtToken.substring(0, 30)}...`);

    // Step 2: Test Master Data Endpoints
    console.log('\n2️⃣  MASTER DATA ENDPOINTS');
    console.log('-'.repeat(70));

    const endpoints = [
      { path: '/api/recruiters', name: 'Recruiters' },
      { path: '/api/companies', name: 'Companies' },
      { path: '/api/job-roles', name: 'Job Roles' },
      { path: '/api/candidates', name: 'Candidates' },
    ];

    const results = {};
    for (const endpoint of endpoints) {
      const response = await makeRequest('GET', endpoint.path, null, jwtToken);
      results[endpoint.path] = response;
      
      const status = response.status === 200 ? '✅' : response.status === 404 ? '❌' : '⚠️';
      console.log(`${status} GET ${endpoint.path}: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
        if (data.length > 0) {
          const firstItem = data[0];
          const keys = Object.keys(firstItem);
          console.log(`   Fields: ${keys.join(', ')}`);
          
          // Verify snake_case
          const issues = verifySnakeCase(firstItem);
          if (issues.length === 0) {
            console.log(`   ✅ All fields use snake_case`);
          } else {
            issues.forEach(issue => console.log(`   ${issue}`));
          }
        }
      }
    }

    // Step 3: Test Applications Endpoint
    console.log('\n3️⃣  APPLICATIONS ENDPOINT');
    console.log('-'.repeat(70));
    const appsResponse = await makeRequest('GET', '/api/applications?page=1&limit=5', null, jwtToken);
    console.log(`${appsResponse.status === 200 ? '✅' : '❌'} GET /api/applications: ${appsResponse.status}`);

    if (appsResponse.status === 200) {
      const apps = Array.isArray(appsResponse.data) ? appsResponse.data : (appsResponse.data.data || []);
      console.log(`   Found ${apps.length} applications`);

      if (apps.length > 0) {
        const app = apps[0];
        console.log(`\n   📋 Field Verification:`);
        const keys = Object.keys(app);
        keys.forEach(key => {
          const isSnakeCase = key.includes('_') || /^[a-z]+$/.test(key);
          console.log(`   ${isSnakeCase ? '✅' : '❌'} ${key} (snake_case: ${isSnakeCase})`);
        });

        // Verify status fields are strings
        console.log(`\n   📊 Status Field Values:`);
        ['call_status', 'interested_status', 'selection_status', 'joining_status'].forEach(field => {
          if (app[field] !== undefined) {
            const isString = typeof app[field] === 'string' || app[field] === null;
            console.log(`   ${isString ? '✅' : '❌'} ${field}: "${app[field]}" (type: ${typeof app[field]})`);
          }
        });

        // Check for nested relations
        if (app.recruiter) {
          console.log(`\n   👤 Recruiter relation fields: ${Object.keys(app.recruiter).join(', ')}`);
        }
        if (app.candidate) {
          console.log(`   👥 Candidate relation fields: ${Object.keys(app.candidate).join(', ')}`);
        }
        if (app.job_role) {
          console.log(`   💼 Job Role relation fields: ${Object.keys(app.job_role).join(', ')}`);
        }
      }
    }

    // Step 4: Test Dashboard Endpoints
    console.log('\n4️⃣  DASHBOARD ENDPOINTS');
    console.log('-'.repeat(70));
    const dashboardEndpoints = [
      { path: '/api/dashboard/stats', name: 'Dashboard Stats' },
      { path: '/api/dashboard/pipeline', name: 'Pipeline' },
      { path: '/api/reports/recruiter-performance', name: 'Recruiter Performance' },
    ];

    for (const endpoint of dashboardEndpoints) {
      const response = await makeRequest('GET', endpoint.path, null, jwtToken);
      const status = response.status === 200 ? '✅' : response.status === 404 ? '❌' : '⚠️';
      console.log(`${status} GET ${endpoint.path}: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        const keys = Object.keys(response.data);
        console.log(`   Fields: ${keys.join(', ')}`);
        const issues = verifySnakeCase(response.data);
        if (issues.length === 0) {
          console.log(`   ✅ All fields use snake_case`);
        } else {
          issues.forEach(issue => console.log(`   ${issue}`));
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    
    const working = Object.values(results).filter(r => r.status === 200).length;
    const total = Object.keys(results).length;
    console.log(`\n✅ Working endpoints: ${working}/${total}`);
    console.log(`❌ Failed endpoints: ${total - working}/${total}`);
    
    if (working === total) {
      console.log('\n🎉 All endpoints are working!');
    } else {
      console.log('\n⚠️  Some endpoints are not accessible. Check route registration.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testComplete();
