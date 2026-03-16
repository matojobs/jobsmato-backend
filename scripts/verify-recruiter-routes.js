/**
 * Verify recruiter routes are accessible
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
      
      console.log('Testing routes with token...\n');
      
      Promise.all([
        makeRequest('GET', '/api/recruiters', token).then(r => ({ path: '/api/recruiters', ...r })),
        makeRequest('GET', '/api/job-roles', token).then(r => ({ path: '/api/job-roles', ...r })),
        makeRequest('GET', '/api/candidates', token).then(r => ({ path: '/api/candidates', ...r })),
        makeRequest('GET', '/api/applications', token).then(r => ({ path: '/api/applications', ...r })),
        makeRequest('GET', '/api/dashboard/stats', token).then(r => ({ path: '/api/dashboard/stats', ...r })),
        makeRequest('GET', '/api/dashboard/pipeline', token).then(r => ({ path: '/api/dashboard/pipeline', ...r })),
      ]).then(results => {
        results.forEach(r => {
          console.log(`${r.status === 200 ? '✅' : r.status === 404 ? '❌' : '⚠️'} ${r.path}: ${r.status}`);
          if (r.status === 200 && r.data && typeof r.data === 'object') {
            const keys = Object.keys(r.data);
            if (keys.length > 0 && keys.length < 20) {
              console.log(`   Keys: ${keys.join(', ')}`);
            }
            if (Array.isArray(r.data) && r.data.length > 0) {
              console.log(`   First item keys: ${Object.keys(r.data[0]).join(', ')}`);
            }
          }
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
