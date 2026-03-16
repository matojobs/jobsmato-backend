#!/usr/bin/env node
/**
 * Test prod APIs one-by-one. Run against production to find failing endpoints.
 *
 * Usage:
 *   node scripts/test-prod-apis.js [BASE_URL]
 *   BASE_URL=https://api.jobsmato.com ADMIN_EMAIL=admin@jobsmato.com ADMIN_PASSWORD=Admin@123 node scripts/test-prod-apis.js
 *
 * Env (optional):
 *   BASE_URL     - e.g. https://api.jobsmato.com (default from arg or this)
 *   ADMIN_EMAIL  - admin login email (default: admin@jobsmato.com)
 *   ADMIN_PASSWORD - admin login password (default: Admin@123)
 */

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'https://api.jobsmato.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jobsmato.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const base = BASE_URL.replace(/\/$/, '');
const apiBase = base.endsWith('/api') ? base : base + '/api';

function pass(msg, detail = '') {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}${detail ? ' ' + detail : ''}`);
}

function fail(msg, status, body) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg} \x1b[90m→ ${status}\x1b[0m`);
  if (body && (body.message || body.error)) console.log(`    \x1b[90m${body.message || body.error}\x1b[0m`);
}

async function request(method, path, body = null, token = null) {
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data };
}

async function run() {
  console.log('\n\x1b[1mTesting APIs at:\x1b[0m', apiBase);
  console.log('Admin:', ADMIN_EMAIL, '\n');

  let adminToken = null;
  let createdUserId = null;
  let createdRecruiterEmail = null;

  // ---- Health (no auth) ----
  console.log('\x1b[1m1. Health\x1b[0m');
  try {
    const { status } = await request('GET', '/health');
    if (status === 200) pass('GET /api/health', status + '');
    else fail('GET /api/health', status);
  } catch (e) {
    fail('GET /api/health', 'ERR', { message: e.message });
  }

  // ---- Admin Auth ----
  console.log('\n\x1b[1m2. Admin Auth\x1b[0m');
  try {
    const { status, data } = await request('POST', '/admin/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = data?.token ?? data?.accessToken ?? data?.user?.accessToken;
    if ((status === 200 || status === 201) && token) {
      adminToken = token;
      pass('POST /admin/auth/login', 'token received');
    } else {
      fail('POST /admin/auth/login', status, data);
    }
  } catch (e) {
    fail('POST /admin/auth/login', 'ERR', { message: e.message });
  }

  if (!adminToken) {
    console.log('\n\x1b[33mNo admin token. Skipping admin endpoints.\x1b[0m\n');
    process.exit(1);
  }

  // ---- Admin Users ----
  console.log('\n\x1b[1m3. Admin Users\x1b[0m');
  try {
    const { status, data } = await request('GET', '/admin/users?page=1&limit=5', null, adminToken);
    if (status === 200 && Array.isArray(data?.users)) {
      pass('GET /admin/users', `total=${data.total ?? data.users.length}`);
    } else {
      fail('GET /admin/users', status, data);
    }
  } catch (e) {
    fail('GET /admin/users', 'ERR', { message: e.message });
  }

  try {
    const { status, data } = await request(
      'POST',
      '/admin/users',
      {
        email: `test-jobseeker-${Date.now()}@test.jobsmato.com`,
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'Jobseeker',
        role: 'job_seeker',
      },
      adminToken,
    );
    if (status === 201 || status === 200) {
      createdUserId = data?.user?.id;
      pass('POST /admin/users (job_seeker)', createdUserId ? `id=${createdUserId}` : '');
    } else {
      fail('POST /admin/users (job_seeker)', status, data);
    }
  } catch (e) {
    fail('POST /admin/users (job_seeker)', 'ERR', { message: e.message });
  }

  try {
    const recruiterEmail = `test-recruiter-${Date.now()}@test.jobsmato.com`;
    const { status, data } = await request(
      'POST',
      '/admin/users',
      {
        email: recruiterEmail,
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'Recruiter',
        role: 'recruiter',
        phone: '+1234567890',
      },
      adminToken,
    );
    if (status === 201 || status === 200) {
      createdRecruiterEmail = recruiterEmail;
      pass('POST /admin/users (recruiter)', data?.user?.id ? `id=${data.user.id}` : '');
    } else {
      fail('POST /admin/users (recruiter)', status, data);
    }
  } catch (e) {
    fail('POST /admin/users (recruiter)', 'ERR', { message: e.message });
  }

  if (createdUserId) {
    try {
      const { status } = await request('GET', `/admin/users/${createdUserId}`, null, adminToken);
      if (status === 200) pass('GET /admin/users/:id', '');
      else fail('GET /admin/users/:id', status);
    } catch (e) {
      fail('GET /admin/users/:id', 'ERR', { message: e.message });
    }
  }

  // ---- Admin Companies ----
  console.log('\n\x1b[1m4. Admin Companies\x1b[0m');
  try {
    const { status, data } = await request('GET', '/admin/companies?page=1&limit=5', null, adminToken);
    if (status === 200 && (Array.isArray(data?.companies) || Array.isArray(data))) {
      const list = data?.companies ?? data;
      pass('GET /admin/companies', `count=${list.length}`);
    } else {
      fail('GET /admin/companies', status, data);
    }
  } catch (e) {
    fail('GET /admin/companies', 'ERR', { message: e.message });
  }

  // ---- Admin Jobs ----
  console.log('\n\x1b[1m5. Admin Jobs\x1b[0m');
  try {
    const { status, data } = await request('GET', '/admin/jobs?page=1&limit=5', null, adminToken);
    if (status === 200 && (Array.isArray(data?.jobs) || Array.isArray(data))) {
      const list = data?.jobs ?? data;
      pass('GET /admin/jobs', `count=${list.length}`);
    } else {
      fail('GET /admin/jobs', status, data);
    }
  } catch (e) {
    fail('GET /admin/jobs', 'ERR', { message: e.message });
  }

  // ---- Admin Dashboard ----
  console.log('\n\x1b[1m6. Admin Dashboard\x1b[0m');
  try {
    const { status, data } = await request('GET', '/admin/dashboard/stats', null, adminToken);
    if (status === 200 && (data?.totalUsers != null || data?.totalJobs != null)) {
      pass('GET /admin/dashboard/stats', '');
    } else {
      fail('GET /admin/dashboard/stats', status, data);
    }
  } catch (e) {
    fail('GET /admin/dashboard/stats', 'ERR', { message: e.message });
  }

  try {
    const { status } = await request('GET', '/admin/dashboard/analytics/users?days=7', null, adminToken);
    if (status === 200) pass('GET /admin/dashboard/analytics/users', '');
    else fail('GET /admin/dashboard/analytics/users', status);
  } catch (e) {
    fail('GET /admin/dashboard/analytics/users', 'ERR', { message: e.message });
  }

  // ---- Admin Auth (permissions) ----
  try {
    const { status } = await request('GET', '/admin/auth/permissions', null, adminToken);
    if (status === 200) pass('GET /admin/auth/permissions', '');
    else fail('GET /admin/auth/permissions', status);
  } catch (e) {
    fail('GET /admin/auth/permissions', 'ERR', { message: e.message });
  }

  // ---- Recruiter portal (login + one endpoint) ----
  console.log('\n\x1b[1m7. Recruiter Portal\x1b[0m');
  if (createdRecruiterEmail) {
    try {
      const { status, data } = await request('POST', '/auth/login', {
        email: createdRecruiterEmail,
        password: 'TestPass123!',
      });
      if (status === 200 && (data?.token || data?.accessToken)) {
        const recToken = data.token || data.accessToken;
        pass('POST /auth/login (recruiter)', 'token received');
        const { status: s2, data: d2 } = await request('GET', '/recruiter/candidates?page=1&limit=5', null, recToken);
        if (s2 === 200) pass('GET /recruiter/candidates', '');
        else fail('GET /recruiter/candidates', s2, d2);
      } else {
        fail('POST /auth/login (recruiter)', status, data);
      }
    } catch (e) {
      fail('Recruiter login or candidates', 'ERR', { message: e.message });
    }
  } else {
    console.log('  \x1b[90m(skip recruiter login: no recruiter created)\x1b[0m');
  }

  console.log('\n\x1b[1mDone.\x1b[0m\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
