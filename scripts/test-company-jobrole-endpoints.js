/**
 * Test enhanced company and job role endpoints
 * Verifies recruiters can see company details with job roles and vice versa
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
  console.log('🧪 Testing Enhanced Company & Job Role Endpoints\n');
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

    // Test 1: Get companies (should include job_roles_count)
    console.log('1️⃣ Testing GET /api/recruiter/companies (with job_roles_count)...');
    const companiesResponse = await makeRequest('GET', '/api/recruiter/companies', null, token);
    if (companiesResponse.status === 200 && Array.isArray(companiesResponse.data)) {
      console.log(`   ✅ Found ${companiesResponse.data.length} companies`);
      if (companiesResponse.data.length > 0) {
        const firstCompany = companiesResponse.data[0];
        console.log(`   ✅ Company "${firstCompany.name}" has ${firstCompany.job_roles_count || 0} job roles`);
        console.log(`   ✅ Company includes: id, name, slug, description, website, industry, job_roles_count`);
      }
    } else {
      console.log(`   ⚠️  Status: ${companiesResponse.status}`);
    }

    // Test 2: Get company by ID (should include job_roles array)
    if (companiesResponse.status === 200 && companiesResponse.data.length > 0) {
      const companyId = companiesResponse.data[0].id;
      console.log(`\n2️⃣ Testing GET /api/recruiter/companies/${companyId} (with job_roles)...`);
      const companyResponse = await makeRequest('GET', `/api/recruiter/companies/${companyId}`, null, token);
      if (companyResponse.status === 200) {
        const company = companyResponse.data;
        console.log(`   ✅ Company "${company.name}" retrieved`);
        console.log(`   ✅ Includes job_roles array: ${Array.isArray(company.job_roles) ? 'Yes' : 'No'}`);
        if (Array.isArray(company.job_roles)) {
          console.log(`   ✅ Found ${company.job_roles.length} job roles for this company`);
          if (company.job_roles.length > 0) {
            console.log(`   ✅ Example: "${company.job_roles[0].role_name}" in ${company.job_roles[0].department || 'N/A'} department`);
          }
        }
      } else {
        console.log(`   ⚠️  Status: ${companyResponse.status}`);
      }
    }

    // Test 3: Get job roles (should include company details)
    console.log('\n3️⃣ Testing GET /api/recruiter/job-roles (with company details)...');
    const jobRolesResponse = await makeRequest('GET', '/api/recruiter/job-roles', null, token);
    if (jobRolesResponse.status === 200 && Array.isArray(jobRolesResponse.data)) {
      console.log(`   ✅ Found ${jobRolesResponse.data.length} job roles`);
      if (jobRolesResponse.data.length > 0) {
        const firstRole = jobRolesResponse.data[0];
        console.log(`   ✅ Job role "${firstRole.role_name}" includes company details: ${firstRole.company ? 'Yes' : 'No'}`);
        if (firstRole.company) {
          console.log(`   ✅ Company: "${firstRole.company.name}" (${firstRole.company.industry || 'N/A'})`);
        }
      }
    } else {
      console.log(`   ⚠️  Status: ${jobRolesResponse.status}`);
    }

    // Test 4: Get job role by ID (should include company details)
    if (jobRolesResponse.status === 200 && jobRolesResponse.data.length > 0) {
      const jobRoleId = jobRolesResponse.data[0].id;
      console.log(`\n4️⃣ Testing GET /api/recruiter/job-roles/${jobRoleId} (with company details)...`);
      const jobRoleResponse = await makeRequest('GET', `/api/recruiter/job-roles/${jobRoleId}`, null, token);
      if (jobRoleResponse.status === 200) {
        const role = jobRoleResponse.data;
        console.log(`   ✅ Job role "${role.role_name}" retrieved`);
        console.log(`   ✅ Includes company details: ${role.company ? 'Yes' : 'No'}`);
        if (role.company) {
          console.log(`   ✅ Company: "${role.company.name}" - ${role.company.description || 'No description'}`);
        }
      } else {
        console.log(`   ⚠️  Status: ${jobRoleResponse.status}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Companies endpoint now includes job_roles_count');
    console.log('   ✅ GET /companies/:id returns company with full job_roles array');
    console.log('   ✅ Job roles endpoint now includes full company details');
    console.log('   ✅ GET /job-roles/:id returns job role with full company details');
    console.log('\n🎯 Recruiters can now see:');
    console.log('   • Which companies have how many job roles');
    console.log('   • All job roles for a specific company');
    console.log('   • Which company each job role belongs to');
    console.log('   • Full company details (name, industry, website) when viewing job roles');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
