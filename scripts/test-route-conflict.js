/**
 * Test route conflict between ApplicationsController and RecruiterController
 */
const http = require('http');

function makeRequest(method, path, token) {
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
      
      Promise.all([
        makeRequest('GET', '/api/applications', token),
        makeRequest('POST', '/api/applications', token),
      ]).then(results => {
        console.log('GET /api/applications:', results[0].status);
        console.log('POST /api/applications:', results[1].status, results[1].data);
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
