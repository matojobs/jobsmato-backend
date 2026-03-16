/**
 * Test POST directly with proper payload
 */
const http = require('http');

function makeRequest(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:5000');
    const req = http.request(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
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
  // Login
  const loginReq = http.request(new URL('/api/auth/login', 'http://localhost:5000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      const login = JSON.parse(body);
      const token = login.accessToken;
      
      console.log('Testing POST /api/applications with recruiter token...');
      
      makeRequest('POST', '/api/applications', {
        candidate_id: 4359,
        job_role_id: 21,
        assigned_date: '2026-02-19',
        call_status: 'Connected',
        interested_status: 'Yes',
      }, token).then(response => {
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      });
    });
  });
  
  loginReq.write(JSON.stringify({
    email: 'recruiter@test.com',
    password: 'recruiter123',
  }));
  loginReq.end();
}

test().catch(console.error);
