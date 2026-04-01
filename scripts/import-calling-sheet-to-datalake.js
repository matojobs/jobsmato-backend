/**
 * Import "Candidate Sourcing Data February 2026 - Calling sheet.csv" into sourcing datalake.
 *
 * - Creates recruiters (users + sourcing.recruiters): first the 6 known (Madhuri, Palak, etc.), then
 *   auto-creates one per distinct "Recruiter Name" in the CSV (e.g. name -> slug@jobsmato.com).
 * - Maps CSV columns to portals, job_roles, candidates, applications
 * - Assigns each row to the recruiter by "Recruiter Name" column
 *
 * Usage (from repo root):
 *   node scripts/import-calling-sheet-to-datalake.js [path-to.csv] [--dry-run] [--limit=N]
 *   node scripts/import-calling-sheet-to-datalake.js [path-to.csv] --parse-only   # no DB, just validate CSV
 *
 * Env: Same as app — DATABASE_URL, or DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME (.env).
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const RECRUITER_EMAILS = [
  'Madhuri@jobsmato.com',
  'Palak@jobsmato.com',
  'Arushi@jobsmato.com',
  'Rashmi@jobsmato.com',
  'Rano@jobsmato.com',
  'ajay@jobsmato.com',
];

const UNASSIGNED_RECRUITER_EMAIL = 'unassigned@jobsmato.com';

// CSV "Recruiter Name" value -> recruiter email (for lookup). Case-insensitive via RECRUITER_EMAILS.
function getRecruiterEmail(recruiterName) {
  const n = (recruiterName || '').trim();
  if (!n) return null;
  const lower = n.toLowerCase();
  for (const e of RECRUITER_EMAILS) {
    const namePart = e.split('@')[0];
    if (namePart.toLowerCase() === lower) return e;
  }
  const cap = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  for (const e of RECRUITER_EMAILS) {
    if (e.split('@')[0] === cap) return e;
  }
  // First-word match e.g. "Rashmi K" -> "Rashmi"
  const firstWord = n.split(/\s+/)[0];
  if (firstWord && firstWord !== n) return getRecruiterEmail(firstWord);
  return null;
}

/** Derive recruiter email from CSV name for auto-created recruiters (slug@jobsmato.com). */
function slugForRecruiterEmail(name) {
  const s = (name || '').trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
  return (s && s.slice(0, 50)) || 'recruiter';
}

const DEFAULT_PASSWORD = 'ChangeMe@123';

function parseCSVLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let field = '';
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\') {
          i++;
          if (i < line.length) field += line[i++];
        } else {
          field += line[i++];
        }
      }
      if (i < line.length) i++; // skip closing "
      out.push(field.trim());
    } else {
      let field = '';
      while (i < line.length && line[i] !== ',') {
        field += line[i++];
      }
      out.push(field.trim());
      if (i < line.length) i++;
    }
  }
  return out;
}

function parseDateDDMMYYYY(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function mapCallStatus(v) {
  if (!v) return null;
  const u = String(v).trim();
  if (/^busy$/i.test(u)) return 1;
  if (/^rnr$/i.test(u)) return 2;
  if (/^connected$/i.test(u)) return 3;
  if (/^wrong\s*number$/i.test(u)) return 4;
  return null;
}

function mapInterested(v) {
  if (!v) return null;
  const u = String(v).trim().toLowerCase();
  if (u === 'yes' || u === 'interested') return 1;
  if (u === 'no' || u.includes('not interested')) return 2;
  if (u.includes('call back') || u.includes('call after')) return 3;
  return null;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

async function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const client = new Client({ connectionString });
    await client.connect();
    return client;
  }
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'jobsmato_db',
  });
  await client.connect();
  return client;
}

async function ensureRecruiters(client, dryRun) {
  for (const email of RECRUITER_EMAILS) {
    const name = email.split('@')[0];
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    if (dryRun) {
      console.log('[DRY-RUN] Would create user + recruiter:', email);
      continue;
    }

    const existingRec = await client.query(
      `SELECT id FROM sourcing.recruiters WHERE email = $1`,
      [email],
    );
    if (existingRec.rows[0]) continue;

    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );
    if (!existingUser.rows[0]) {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
      await client.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, status, "isActive", "onboardingComplete", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'recruiter', 'active', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [email, hash, displayName, 'Recruiter'],
      );
      console.log('Created user:', email);
    }

    await client.query(
      `INSERT INTO sourcing.recruiters (name, email, is_active, created_at, updated_at)
       VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO NOTHING`,
      [displayName, email],
    );
    console.log('Recruiter ready:', email);
  }

  // Unassigned recruiter for rows with empty "Recruiter Name"
  if (!dryRun) {
    const unassigned = await client.query(
      `SELECT id FROM sourcing.recruiters WHERE email = $1`,
      [UNASSIGNED_RECRUITER_EMAIL],
    );
    if (!unassigned.rows[0]) {
      const existingUser = await client.query(`SELECT id FROM users WHERE email = $1`, [UNASSIGNED_RECRUITER_EMAIL]);
      if (!existingUser.rows[0]) {
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
        await client.query(
          `INSERT INTO users (email, password, "firstName", "lastName", role, status, "isActive", "onboardingComplete", "createdAt", "updatedAt")
           VALUES ($1, $2, 'Unassigned', 'Recruiter', 'recruiter', 'active', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [UNASSIGNED_RECRUITER_EMAIL, hash],
        );
      }
      await client.query(
        `INSERT INTO sourcing.recruiters (name, email, is_active, created_at, updated_at)
         VALUES ('Unassigned', $1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (email) DO NOTHING`,
        [UNASSIGNED_RECRUITER_EMAIL],
      );
    }
  }

  const emailsForFixed = [...RECRUITER_EMAILS, UNASSIGNED_RECRUITER_EMAIL];
  const all = await client.query(
    `SELECT id, email FROM sourcing.recruiters WHERE email = ANY($1)`,
    [emailsForFixed],
  );
  const byEmail = {};
  all.rows.forEach((r) => (byEmail[r.email] = r.id));
  if (dryRun) {
    emailsForFixed.forEach((e, i) => (byEmail[e] = byEmail[e] || i + 1));
  }
  return byEmail;
}

/** Ensure a recruiter (user + sourcing.recruiters) exists for each derived email. */
async function ensureRecruitersFromNames(client, nameToEmail, dryRun) {
  const derived = Object.entries(nameToEmail).filter(
    ([, email]) => !RECRUITER_EMAILS.includes(email),
  );
  const byEmail = new Map();
  derived.forEach(([, email]) => byEmail.set(email, true));
  const emailsToCreate = [...byEmail.keys()];

  for (const email of emailsToCreate) {
    const displayName =
      Object.entries(nameToEmail).find(([, e]) => e === email)?.[0]?.trim() || email.split('@')[0];
    const name =
      displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    if (dryRun) {
      console.log('[DRY-RUN] Would create user + recruiter:', email, '(' + name + ')');
      continue;
    }

    const existingRec = await client.query(
      `SELECT id FROM sourcing.recruiters WHERE email = $1`,
      [email],
    );
    if (existingRec.rows[0]) continue;

    const existingUser = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (!existingUser.rows[0]) {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
      await client.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, status, "isActive", "onboardingComplete", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'recruiter', 'active', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [email, hash, name, 'Recruiter'],
      );
      console.log('Created user:', email);
    }

    await client.query(
      `INSERT INTO sourcing.recruiters (name, email, is_active, created_at, updated_at)
       VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO NOTHING`,
      [name, email],
    );
    console.log('Recruiter ready:', email);
  }
}

async function ensurePartition(client, tableName, dateStr) {
  const r = await client.query(
    `SELECT sourcing.create_monthly_partition($1, $2::DATE)`,
    [tableName, dateStr],
  );
  return r;
}

async function run() {
  const args = process.argv.slice(2);
  const csvPath =
    args.find((a) => !a.startsWith('--')) ||
    path.join(__dirname, '..', 'Candidate Sourcing Data Feburary 2026 - Calling sheet.csv');
  const dryRun = args.includes('--dry-run');
  const parseOnly = args.includes('--parse-only');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCSVLine(lines[0]);
  const col = (name) => {
    const i = header.findIndex((h) => h.replace(/"+$/g, '').trim().toLowerCase().includes(name.toLowerCase()));
    return i >= 0 ? i : -1;
  };
  const recruiterIdx = col('Recruiter');
  if (recruiterIdx < 0) {
    console.error('Recruiter column not found. Header:', header);
    process.exit(1);
  }
  const idx = {
    portal: col('Portal'),
    jobRole: col('Job Role'),
    companyAcc: col('Company Acc'),
    assignedDate: col('Assigned Date'),
    recruiterName: recruiterIdx,
    candidateName: col('Candidate Name') >= 0 ? col('Candidate Name') : recruiterIdx + 2,
    number: col('Number') >= 0 ? col('Number') : recruiterIdx + 3,
    callDate: recruiterIdx + 4,
    callStatus: recruiterIdx + 5,
    interested: recruiterIdx + 6,
    notInterestedRemark: col('Not Interested Remark'),
    notes: col('Notes'),
    emailId: col('Email ID'),
    companyName: col('Company Name'),
  };

  if (parseOnly) {
    console.log('Column indices:', idx);
    const recruiterNames = new Set();
    for (let i = 1; i < Math.min(101, lines.length); i++) {
      const row = parseCSVLine(lines[i]);
      if (idx.recruiterName >= 0 && row[idx.recruiterName]) recruiterNames.add(row[idx.recruiterName]);
    }
    console.log('Recruiter names in CSV (first 100 rows):', [...recruiterNames]);
    console.log('Total data rows:', lines.length - 1);
    return;
  }

  const client = await getClient();
  try {
    await ensureRecruiters(client, dryRun);

    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    const header = parseCSVLine(lines[0]);

    if (idx.callDate < 0 || idx.callStatus < 0) {
      console.error('Required columns (Call Date, Call Status) not found. Header:', header);
      process.exit(1);
    }

    const companyRes = await client.query(`SELECT id FROM companies LIMIT 1`);
    const companyId = companyRes.rows[0]?.id;
    if (!companyId && !dryRun) {
      console.error('No company found in companies table. Create at least one company.');
      process.exit(1);
    }

    const dataLines = limit ? lines.slice(1, 1 + limit) : lines.slice(1);
    const headerLen = parseCSVLine(lines[0]).length;

    // First pass: collect unique recruiter names and build name -> email (fixed or slug@jobsmato.com)
    const uniqueRecruiterNames = new Set();
    for (let i = 0; i < dataLines.length; i++) {
      let row = parseCSVLine(dataLines[i]);
      if (row.length === headerLen - 1 && recruiterIdx >= 0) row.splice(recruiterIdx + 1, 0, '');
      const recruiterName = (idx.recruiterName >= 0 && row[idx.recruiterName] !== undefined ? row[idx.recruiterName] : '').trim();
      if (recruiterName) uniqueRecruiterNames.add(recruiterName);
    }
    const nameToEmail = {};
    for (const name of uniqueRecruiterNames) {
      nameToEmail[name] = getRecruiterEmail(name) || (slugForRecruiterEmail(name) + '@jobsmato.com');
    }
    await ensureRecruitersFromNames(client, nameToEmail, dryRun);

    const allEmails = [...new Set([...RECRUITER_EMAILS, UNASSIGNED_RECRUITER_EMAIL, ...Object.values(nameToEmail)])];
    let recruiterIdsByEmail = {};
    if (!dryRun) {
      const allRec = await client.query(
        `SELECT id, email FROM sourcing.recruiters WHERE email = ANY($1)`,
        [allEmails],
      );
      allRec.rows.forEach((r) => (recruiterIdsByEmail[r.email] = r.id));
    } else {
      allEmails.forEach((e, i) => (recruiterIdsByEmail[e] = i + 1));
    }
    console.log('Recruiter IDs loaded:', Object.keys(recruiterIdsByEmail).length);

    let portalIdByName = {};
    let jobRoleIdByKey = {};
    let candidateIdByPhone = {};
    let createdPortals = 0;
    let createdJobRoles = 0;
    let createdCandidates = 0;
    let insertedApps = 0;
    let skipped = 0;
    const skipReasons = { recruiter: 0, phone: 0, date: 0, jobOrCandidate: 0 };
    const monthsDone = new Set();

    console.log('Processing rows:', dataLines.length);

    for (let i = 0; i < dataLines.length; i++) {
      let row = parseCSVLine(dataLines[i]);
      if (row.length === headerLen - 1 && recruiterIdx >= 0) {
        row.splice(recruiterIdx + 1, 0, '');
      }
      const get = (k) => (idx[k] >= 0 && row[idx[k]] !== undefined ? row[idx[k]] : '');

      const recruiterName = get('recruiterName').trim();
      const email =
        (recruiterName && (getRecruiterEmail(recruiterName) || nameToEmail[recruiterName])) ||
        UNASSIGNED_RECRUITER_EMAIL;
      if (!recruiterIdsByEmail[email]) {
        skipReasons.recruiter++;
        skipped++;
        continue;
      }
      const recruiterId = recruiterIdsByEmail[email];

      const portalName = (get('portal') || 'Work India').trim() || 'Work India';
      if (!portalIdByName[portalName] && !dryRun) {
        await client.query(
          `INSERT INTO sourcing.portals (name, created_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING`,
          [portalName],
        );
        const sel = await client.query(`SELECT id FROM sourcing.portals WHERE name = $1`, [portalName]);
        portalIdByName[portalName] = sel.rows[0].id;
        createdPortals++;
      } else if (dryRun && !portalIdByName[portalName]) {
        portalIdByName[portalName] = 1;
      }

      const jobRoleName = (get('jobRole') || 'TeleSales').trim() || 'TeleSales';
      const jrKey = `${companyId}-${jobRoleName}`;
      if (!jobRoleIdByKey[jrKey] && companyId && !dryRun) {
        await client.query(
          `INSERT INTO sourcing.job_roles (company_id, role_name, is_active, created_at, updated_at)
           VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (company_id, role_name) DO NOTHING`,
          [companyId, jobRoleName],
        );
        const sel = await client.query(
          `SELECT id FROM sourcing.job_roles WHERE company_id = $1 AND role_name = $2`,
          [companyId, jobRoleName],
        );
        jobRoleIdByKey[jrKey] = sel.rows[0]?.id;
        if (jobRoleIdByKey[jrKey]) createdJobRoles++;
      } else if (dryRun) {
        jobRoleIdByKey[jrKey] = 1;
      }

      const phone = get('number');
      const normalized = normalizePhone(phone);
      if (!normalized) {
        skipReasons.phone++;
        skipped++;
        continue;
      }

      if (!candidateIdByPhone[normalized] && !dryRun) {
        const hashResult = await client.query(`SELECT sourcing.hash_phone($1) as h`, [phone]);
        const phoneHash = hashResult.rows[0]?.h;
        const existing = await client.query(
          `SELECT id FROM sourcing.candidates WHERE phone_hash = $1`,
          [phoneHash],
        );
        if (existing.rows[0]) {
          candidateIdByPhone[normalized] = existing.rows[0].id;
        } else {
          const candName = (get('candidateName') || 'Unknown').trim() || 'Unknown';
          const candEmail = (get('emailId') || '').trim() || null;
          const pid = portalIdByName[portalName] || null;
          await client.query(
            `INSERT INTO sourcing.candidates (name, phone, email, portal_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (phone_hash) DO NOTHING`,
            [candName, phone, candEmail, pid],
          );
          const sel = await client.query(
            `SELECT id FROM sourcing.candidates WHERE phone_hash = $1`,
            [phoneHash],
          );
          if (sel.rows[0]) {
            candidateIdByPhone[normalized] = sel.rows[0].id;
            createdCandidates++;
          }
        }
      } else if (dryRun && !candidateIdByPhone[normalized]) {
        candidateIdByPhone[normalized] = 1;
      }

      const assignedDate = parseDateDDMMYYYY(get('assignedDate'));
      if (!assignedDate) {
        skipReasons.date++;
        skipped++;
        continue;
      }
      if (!monthsDone.has(assignedDate.slice(0, 7)) && !dryRun) {
        await ensurePartition(client, 'applications', assignedDate);
        monthsDone.add(assignedDate.slice(0, 7));
      }

      const callDate = parseDateDDMMYYYY(get('callDate'));
      const callStatus = mapCallStatus(get('callStatus'));
      const interested = mapInterested(get('interested'));
      const notes = [get('notInterestedRemark'), get('notes')].filter(Boolean).join('; ') || null;
      const jobRoleId = jobRoleIdByKey[jrKey];
      const candidateId = candidateIdByPhone[normalized];
      if (!jobRoleId || !candidateId) {
        skipReasons.jobOrCandidate++;
        skipped++;
        continue;
      }

      if (dryRun) {
        if (i < 5) {
          console.log('[DRY-RUN] Row', i + 1, { recruiterId, candidateId, jobRoleId, assignedDate, callStatus, interested });
        }
        insertedApps++;
        continue;
      }

      // Create application so this recruiter sees this candidate on the recruiter portal
      await client.query(
        `INSERT INTO sourcing.applications (
          candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
          call_status, interested, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          candidateId,
          recruiterId,
          jobRoleId,
          assignedDate,
          callDate || null,
          callStatus,
          interested,
          notes,
        ],
      );
      insertedApps++;
      if ((i + 1) % 1000 === 0) console.log('Processed', i + 1, 'rows...');
    }

    console.log('Done.');
    console.log('Portals created:', createdPortals);
    console.log('Job roles created:', createdJobRoles);
    console.log('Candidates created:', createdCandidates);
    console.log('Applications inserted:', insertedApps);
    console.log('Skipped:', skipped);
    if (skipped > 0) console.log('Skip reasons:', skipReasons);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
