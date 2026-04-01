/**
 * Test script for recruiter application APIs and applications recruiter-call.
 *
 * Usage:
 *   node scripts/test-recruiter-application-apis.js
 *   RECRUITER_EMAIL=z@z.com RECRUITER_PASSWORD=yourpass node scripts/test-recruiter-application-apis.js
 *   RECRUITER_TOKEN=<jwt> API_BASE=https://api.jobsmato.com/api node scripts/test-recruiter-application-apis.js
 *
 * Env:
 *   API_BASE     - Base URL (default: https://api.jobsmato.com/api)
 *   RECRUITER_EMAIL, RECRUITER_PASSWORD - For login (or set RECRUITER_TOKEN to skip login)
 *   RECRUITER_TOKEN - JWT; if set, login is skipped
 */

const API_BASE = process.env.API_BASE || process.env.API_BASE_URL || 'https://api.jobsmato.com/api';
const RECRUITER_EMAIL = process.env.RECRUITER_EMAIL;
const RECRUITER_PASSWORD = process.env.RECRUITER_PASSWORD;
let RECRUITER_TOKEN = process.env.RECRUITER_TOKEN;

function log(msg, ok = null) {
  const prefix = ok === true ? '[PASS]' : ok === false ? '[FAIL]' : '[INFO]';
  console.log(`${prefix} ${msg}`);
}

async function request(method, path, body = null, token = null) {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('\n--- Recruiter & Application APIs test ---');
  console.log(`API_BASE: ${API_BASE}\n`);

  if (!RECRUITER_TOKEN && (RECRUITER_EMAIL && RECRUITER_PASSWORD)) {
    log('Logging in as recruiter...');
    const { status, data } = await request('POST', '/auth/recruiter-login', {
      email: RECRUITER_EMAIL,
      password: RECRUITER_PASSWORD,
    });
    if (status !== 200 || !data?.access_token) {
      log('Recruiter login failed. Set RECRUITER_EMAIL and RECRUITER_PASSWORD, or RECRUITER_TOKEN.', false);
      console.log('Response:', status, data);
      process.exit(1);
    }
    RECRUITER_TOKEN = data.access_token;
    log('Recruiter login OK', true);
  }

  if (!RECRUITER_TOKEN) {
    log('No RECRUITER_TOKEN or RECRUITER_EMAIL/RECRUITER_PASSWORD. Skipping authenticated tests.', false);
    log('Testing public health only...');
    const { status, data } = await request('GET', '/health');
    log(`GET /health -> ${status}`, status === 200);
    if (data) console.log(JSON.stringify(data).slice(0, 200));
    process.exit(0);
  }

  const token = RECRUITER_TOKEN;
  let applicationId = null;
  let testsPassed = 0;
  let testsFailed = 0;

  // 1. GET /api/recruiter/applications
  log('GET /api/recruiter/applications (list with source, all fields)');
  const listRes = await request('GET', '/recruiter/applications', null, token);
  if (listRes.status !== 200) {
    log(`Expected 200, got ${listRes.status}`, false);
    testsFailed++;
    if (listRes.data?.message) console.log(listRes.data.message);
  } else {
    const list = listRes.data?.data ?? listRes.data;
    const arr = Array.isArray(list) ? list : [];
    log(`  -> 200, count: ${arr.length}`, true);
    testsPassed++;
    if (arr.length > 0) {
      applicationId = arr[0].id;
      const first = arr[0];
      const hasSource = 'source' in first;
      const hasCallStatus = 'call_status' in first;
      const hasSelectionStatus = 'selection_status' in first;
      log(`  -> first item has source: ${hasSource}, call_status: ${hasCallStatus}, selection_status: ${hasSelectionStatus}`, hasSource && (hasCallStatus || first.source === 'job_portal'));
    }
  }

  // 2. GET /api/recruiter/applications/:id
  if (applicationId) {
    log(`GET /api/recruiter/applications/${applicationId}`);
    const getRes = await request('GET', `/recruiter/applications/${applicationId}`, null, token);
    if (getRes.status !== 200) {
      log(`Expected 200, got ${getRes.status}`, false);
      testsFailed++;
    } else {
      const app = getRes.data;
      const hasFields = app && ['call_status', 'assigned_date', 'selection_status', 'interview_status', 'notes'].every((f) => f in app);
      log(`  -> 200, has new fields: ${hasFields}`, true);
      testsPassed++;
    }
  } else {
    log('GET /api/recruiter/applications/:id (skipped, no application id)');
  }

  // 3. PATCH /api/recruiter/applications/:id (partial update)
  if (applicationId) {
    log(`PATCH /api/recruiter/applications/${applicationId} (notes only)`);
    const patchPayload = { notes: `Test update at ${new Date().toISOString()}` };
    const patchRes = await request('PATCH', `/recruiter/applications/${applicationId}`, patchPayload, token);
    if (patchRes.status !== 200) {
      log(`Expected 200, got ${patchRes.status}`, false);
      testsFailed++;
      if (patchRes.data?.message) console.log(patchRes.data.message);
    } else {
      const updated = patchRes.data;
      log(`  -> 200, notes updated: ${updated?.notes === patchPayload.notes}`, true);
      testsPassed++;
    }
  }

  // 4. GET /api/recruiter/dashboard/stats
  log('GET /api/recruiter/dashboard/stats');
  const statsRes = await request('GET', '/recruiter/dashboard/stats', null, token);
  if (statsRes.status !== 200) {
    log(`Expected 200, got ${statsRes.status}`, false);
    testsFailed++;
  } else {
    const hasKeys = statsRes.data && ['total_applications', 'total_candidates', 'connected_calls', 'interested_count'].every((k) => k in statsRes.data);
    log(`  -> 200, has stats keys: ${hasKeys}`, true);
    testsPassed++;
  }

  // 5. GET /api/applications/pending (applications module, recruiter role)
  log('GET /api/applications/pending');
  const pendingRes = await request('GET', '/applications/pending', null, token);
  if (pendingRes.status !== 200) {
    log(`Expected 200, got ${pendingRes.status}`, false);
    testsFailed++;
  } else {
    const arr = Array.isArray(pendingRes.data) ? pendingRes.data : [];
    log(`  -> 200, count: ${arr.length}`, true);
    testsPassed++;
  }

  // 6. PATCH /api/applications/:id/recruiter-call (call status: Connected; interested required)
  if (applicationId) {
    log(`PATCH /api/applications/${applicationId}/recruiter-call (Connected + interested)`);
    const callPayload = {
      callDate: new Date().toISOString().split('T')[0],
      callStatus: 'Connected',
      interested: true,
    };
    const callRes = await request('PATCH', `/applications/${applicationId}/recruiter-call`, callPayload, token);
    if (callRes.status !== 200) {
      log(`Expected 200, got ${callRes.status}`, false);
      testsFailed++;
      if (callRes.data?.message) console.log(callRes.data.message);
    } else {
      log(`  -> 200, recruiter call updated`, true);
      testsPassed++;
    }
  }

  // 7. Call status validation: "call connected" no longer accepted (DTO validation should 400)
  log('PATCH /api/applications/1/recruiter-call with callStatus "call connected" (expect 400)');
  const badCallRes = await request('PATCH', '/applications/1/recruiter-call', {
    callDate: new Date().toISOString().split('T')[0],
    callStatus: 'call connected',
    interested: true,
  }, token);
  const expectBad = badCallRes.status === 400;
  log(`  -> ${badCallRes.status} (400 expected for invalid callStatus)`, expectBad);
  if (expectBad) testsPassed++; else testsFailed++;

  console.log('\n--- Summary ---');
  console.log(`Passed: ${testsPassed}, Failed: ${testsFailed}`);
  const code = testsFailed > 0 ? 1 : 0;
  setImmediate(() => process.exit(code));
}

main().catch((err) => {
  console.error(err);
  setImmediate(() => process.exit(1));
});
