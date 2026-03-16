/**
 * Debug guard issue
 */
const http = require('http');

function makeRequest(method, path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:5000');
    const req = http.request(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
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
      
      console.log('User from login:', {
        userId: login.userId,
        email: login.email,
        role: login.role,
        fullName: login.fullName,
      });
      
      // Test recruiters endpoint
      makeRequest('GET', '/api/recruiters', token).then(response => {
        console.log('\nGET /api/recruiters:');
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
