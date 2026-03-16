/**
 * Test dashboard endpoints for errors
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
        makeRequest('GET', '/api/dashboard/stats', token),
        makeRequest('GET', '/api/dashboard/pipeline', token),
        makeRequest('GET', '/api/reports/recruiter-performance', token),
      ]).then(results => {
        results.forEach((r, i) => {
          const endpoints = ['/api/dashboard/stats', '/api/dashboard/pipeline', '/api/reports/recruiter-performance'];
          console.log(`\n${endpoints[i]}:`);
          console.log(`Status: ${r.status}`);
          console.log(`Response:`, JSON.stringify(r.data, null, 2).substring(0, 500));
        });
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
