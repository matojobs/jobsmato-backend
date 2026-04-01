/**
 * Manual test with detailed output
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

async function test() {
  // Login
  const login = await makeRequest('POST', '/api/auth/login', {
    email: 'recruiter@test.com',
    password: 'recruiter123',
  });
  
  console.log('Login:', login.status, login.data);
  const token = login.data.accessToken;
  
  if (!token) {
    console.error('No token!');
    return;
  }

  // Test recruiters endpoint
  const recruiters = await makeRequest('GET', '/api/recruiters', null, token);
  console.log('\nRecruiters:', recruiters.status);
  console.log('Response:', JSON.stringify(recruiters.data, null, 2));
  
  // Test applications
  const apps = await makeRequest('GET', '/api/applications?page=1&limit=1', null, token);
  console.log('\nApplications:', apps.status);
  if (apps.status === 200) {
    console.log('Response keys:', Object.keys(apps.data));
    if (apps.data.data && apps.data.data.length > 0) {
      console.log('First app keys:', Object.keys(apps.data.data[0]));
      console.log('First app:', JSON.stringify(apps.data.data[0], null, 2));
    }
  } else {
    console.log('Response:', JSON.stringify(apps.data, null, 2));
  }
}

test().catch(console.error);
