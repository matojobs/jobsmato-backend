/**
 * Test recruiter routes with new /api/recruiter prefix
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

async function test() {
  console.log('🧪 Testing Recruiter Routes with /api/recruiter prefix\n');
  console.log('='.repeat(70));

  try {
    // Login
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

    // Test all recruiter routes
    const routes = [
      { method: 'GET', path: '/api/recruiter/recruiters', name: 'Get Recruiters' },
      { method: 'GET', path: '/api/recruiter/companies', name: 'Get Companies' },
      { method: 'GET', path: '/api/recruiter/job-roles', name: 'Get Job Roles' },
      { method: 'GET', path: '/api/recruiter/candidates', name: 'Get Candidates' },
      { method: 'GET', path: '/api/recruiter/applications', name: 'Get Applications' },
      { method: 'GET', path: '/api/recruiter/dashboard/stats', name: 'Dashboard Stats' },
      { method: 'GET', path: '/api/recruiter/dashboard/pipeline', name: 'Dashboard Pipeline' },
      { method: 'GET', path: '/api/recruiter/reports/recruiter-performance', name: 'Recruiter Performance' },
    ];

    console.log('Testing Routes:\n');
    for (const route of routes) {
      const response = await makeRequest(route.method, route.path, null, token);
      const status = response.status === 200 ? '✅' : response.status === 404 ? '❌' : '⚠️';
      console.log(`${status} ${route.method} ${route.path}: ${response.status} - ${route.name}`);
      
      if (response.status === 200 && route.path.includes('applications') && Array.isArray(response.data)) {
        console.log(`   Found ${response.data.length} applications`);
      }
    }

    // Test POST application
    console.log('\n📝 Testing POST /api/recruiter/applications...');
    const candidatesResponse = await makeRequest('GET', '/api/recruiter/candidates', null, token);
    const jobRolesResponse = await makeRequest('GET', '/api/recruiter/job-roles', null, token);

    if (candidatesResponse.status === 200 && jobRolesResponse.status === 200) {
      const candidates = Array.isArray(candidatesResponse.data) ? candidatesResponse.data : [];
      const jobRoles = Array.isArray(jobRolesResponse.data) ? jobRolesResponse.data : [];

      if (candidates.length > 0 && jobRoles.length > 0) {
        const createResponse = await makeRequest('POST', '/api/recruiter/applications', {
          candidate_id: parseInt(candidates[0].id),
          job_role_id: parseInt(jobRoles[0].id),
          assigned_date: new Date().toISOString().split('T')[0],
          call_status: 'Connected',
          interested_status: 'Yes',
        }, token);

        const createStatus = createResponse.status === 201 || createResponse.status === 200 ? '✅' : '❌';
        console.log(`${createStatus} POST /api/recruiter/applications: ${createResponse.status}`);
        
        if (createResponse.status === 201 || createResponse.status === 200) {
          console.log(`   ✅ Application created successfully!`);
        } else {
          console.log(`   Response: ${JSON.stringify(createResponse.data, null, 2).substring(0, 200)}`);
        }
      } else {
        console.log('   ⚠️  Skipping POST test (need candidates and job roles)');
      }
    }

    // Verify job seeker routes still work
    console.log('\n🔍 Verifying Job Seeker Routes Still Work...');
    console.log('   (These should return 403 for recruiter, confirming routes are separate)');
    
    const jobSeekerRoutes = [
      { method: 'GET', path: '/api/applications', name: 'Job Seeker Applications' },
      { method: 'POST', path: '/api/applications', name: 'Job Seeker Create Application' },
      { method: 'GET', path: '/api/companies', name: 'Job Seeker Companies' },
    ];

    for (const route of jobSeekerRoutes) {
      const response = await makeRequest(route.method, route.path, route.method === 'POST' ? { jobId: 1 } : null, token);
      // These should return 403 or 401 for recruiter (confirming they're separate routes)
      console.log(`   ${route.method} ${route.path}: ${response.status} (expected 403/401 for recruiter)`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Route testing complete!');
    console.log('\n📋 New Recruiter Routes:');
    console.log('   All routes now prefixed with /api/recruiter/');
    console.log('   - /api/recruiter/applications (instead of /api/applications)');
    console.log('   - /api/recruiter/companies (instead of /api/companies)');
    console.log('   - /api/recruiter/recruiters');
    console.log('   - /api/recruiter/job-roles');
    console.log('   - /api/recruiter/candidates');
    console.log('   - /api/recruiter/dashboard/stats');
    console.log('   - /api/recruiter/dashboard/pipeline');
    console.log('   - /api/recruiter/reports/recruiter-performance');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
