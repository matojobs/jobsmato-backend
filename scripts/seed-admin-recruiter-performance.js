/**
 * Seed dummy data for Admin Recruiter Performance dashboard.
 * Inserts sourcing.recruiters, sourcing.candidates, sourcing.applications
 * (and ensures companies + sourcing.job_roles exist) so DOD, MTD,
 * company-wise, client-report, negative-funnel and interview-status endpoints show data.
 *
 * Run: node scripts/seed-admin-recruiter-performance.js
 * Or:  npx dotenv -e .env -- node scripts/seed-admin-recruiter-performance.js
 */
require('dotenv').config();
const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
};

// Status enums (same as backend)
const CALL_STATUS = { BUSY: 1, RNR: 2, CONNECTED: 3, WRONG_NUMBER: 4, SWITCH_OFF: 5, INCOMING_OFF: 6, CALL_BACK: 7, INVALID: 8, OUT_OF_NETWORK: 9 };
const INTERESTED = { YES: 1, NO: 2, CALL_BACK_LATER: 3 };
const SELECTION = { SELECTED: 1, NOT_SELECTED: 2, PENDING: 3 };
const JOINING = { JOINED: 1, NOT_JOINED: 2, PENDING: 3, BACKED_OUT: 4 };

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function firstDayOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function seed() {
  const client = new Client(config);
  const now = new Date();
  const today = dateStr(now);
  const yesterday = dateStr(addDays(now, -1));
  const thisMonthStart = firstDayOfMonth(now);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // 1) Ensure partitions exist for current month (and previous for variety)
    await client.query(`SELECT sourcing.create_monthly_partition('applications', $1::date)`, [thisMonthStart]);
    await client.query(`SELECT sourcing.create_monthly_partition('applications', $1::date)`, [addDays(thisMonthStart, -1)]);
    console.log('Partitions ensured for applications\n');

    // 2) Recruiters – get existing or insert 3
    let recruiters = (await client.query(
      `SELECT id, name, email FROM sourcing.recruiters WHERE is_active = true ORDER BY id LIMIT 10`
    )).rows;
    if (recruiters.length < 2) {
      const names = ['Alice Recruiter', 'Bob Sourcer', 'Carol Talent'];
      for (let i = 0; i < names.length; i++) {
        await client.query(
          `INSERT INTO sourcing.recruiters (name, email, phone, is_active, created_at, updated_at)
           VALUES ($1, $2, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (email) DO NOTHING`,
          [names[i], `seed-recruiter-${i + 1}-${Date.now()}@jobsmato.local`]
        );
      }
      recruiters = (await client.query(
        `SELECT id, name, email FROM sourcing.recruiters WHERE is_active = true ORDER BY id LIMIT 10`
      )).rows;
    }
    console.log(`Recruiters: ${recruiters.length} (ids: ${recruiters.map(r => r.id).join(', ')})\n`);

    // 3) Companies & job roles – get existing or create 2 companies with job roles
    let companies = (await client.query(`SELECT id, name FROM companies ORDER BY id LIMIT 5`)).rows;
    if (companies.length === 0) {
      await client.query(
        `INSERT INTO companies (name, slug, description, industry, "adminStatus", "isVerified", "createdAt", "updatedAt")
         VALUES 
           ('Seed Tech Corp', 'seed-tech-corp-' || $1, 'Technology company', 'Technology', 'approved', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
           ('Seed Health Ltd', 'seed-health-ltd-' || $1, 'Healthcare company', 'Healthcare', 'approved', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name`,
        [Date.now()]
      );
      companies = (await client.query(`SELECT id, name FROM companies ORDER BY id`)).rows;
    }
    let jobRoles = (await client.query(
      `SELECT jr.id, jr.company_id, jr.role_name FROM sourcing.job_roles jr WHERE jr.is_active = true ORDER BY jr.id LIMIT 20`
    )).rows;
    if (jobRoles.length < 2) {
      for (const c of companies.slice(0, 2)) {
        for (const role of ['Software Engineer', 'Product Manager', 'Data Analyst']) {
          await client.query(
            `INSERT INTO sourcing.job_roles (company_id, role_name, department, is_active, created_at, updated_at)
             VALUES ($1, $2, 'Engineering', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (company_id, role_name) DO NOTHING`,
            [c.id, role]
          );
        }
      }
      jobRoles = (await client.query(
        `SELECT jr.id, jr.company_id, jr.role_name FROM sourcing.job_roles jr WHERE jr.is_active = true ORDER BY jr.id`
      )).rows;
    }
    console.log(`Companies: ${companies.length}, Job roles: ${jobRoles.length}\n`);

    // 4) Candidates – insert with unique phones (avoid hash conflict)
    const basePhone = 919800000000 + (Date.now() % 1000000);
    const candidateNames = [
      'Ravi Kumar', 'Priya Sharma', 'Amit Singh', 'Sneha Patel', 'Vikram Reddy',
      'Kavita Nair', 'Rajesh Iyer', 'Anita Desai', 'Sanjay Mehta', 'Pooja Joshi',
      'Arun Krishnan', 'Divya Rao', 'Kiran Pillai', 'Manish Gupta', 'Neha Agarwal',
      'Suresh Nambiar', 'Lakshmi Venkat', 'Rahul Bose', 'Shweta Menon', 'Deepak Chopra',
      'Preeti Saxena', 'Vivek Malhotra', 'Anjali Bhat', 'Rohit Kapoor', 'Nidhi Verma',
    ];
    const candidateIds = [];
    for (let i = 0; i < candidateNames.length; i++) {
      const phone = String(basePhone + i).slice(0, 12);
      const res = await client.query(
        `INSERT INTO sourcing.candidates (name, phone, email, portal_id, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (phone_hash) DO NOTHING
         RETURNING id`,
        [candidateNames[i], phone, `cand${i + 1}-${Date.now()}@seed.local`]
      );
      if (res.rows[0]) candidateIds.push(res.rows[0].id);
    }
    if (candidateIds.length === 0) {
      console.log('No new candidates (phones may already exist). Using existing candidates.');
      const existing = (await client.query(`SELECT id FROM sourcing.candidates ORDER BY id LIMIT 25`)).rows;
      existing.forEach(r => candidateIds.push(r.id));
    }
    console.log(`Candidates: ${candidateIds.length} available for applications\n`);

    // 5) Applications – varied dates and statuses for DOD/MTD/dashboard
    const appRows = [];
    const assignedDates = [today, today, today, yesterday, yesterday, today];
    const callDates = [today, today, yesterday, yesterday, null, today];
    const callStatuses = [CALL_STATUS.CONNECTED, CALL_STATUS.CONNECTED, CALL_STATUS.RNR, CALL_STATUS.BUSY, null, CALL_STATUS.CONNECTED];
    const interesteds = [INTERESTED.YES, INTERESTED.NO, INTERESTED.NO, null, null, INTERESTED.YES];
    const notInterestedRemarks = [null, 'Salary too low', 'Not looking', null, null, null];
    const interviewScheduled = [true, false, false, false, false, true];
    const interviewDates = [today, null, null, null, null, addDays(now, 1)];
    const interviewStatuses = ['Done', null, null, null, null, 'Scheduled'];
    const turnups = [true, null, null, null, null, null];
    const selectionStatuses = [SELECTION.SELECTED, SELECTION.NOT_SELECTED, null, null, null, SELECTION.PENDING];
    const joiningStatuses = [JOINING.JOINED, JOINING.NOT_JOINED, null, null, null, JOINING.PENDING];
    const joiningDates = [today, null, null, null, null, null];
    const backoutDates = [null, null, null, null, null, null];
    const backoutReasons = [null, null, null, null, null, null];

    for (let i = 0; i < Math.max(35, candidateIds.length); i++) {
      const rec = recruiters[i % recruiters.length];
      const jr = jobRoles[i % jobRoles.length];
      const cid = candidateIds[i % candidateIds.length];
      const dayOffset = i % 7;
      const assignedDate = dateStr(addDays(now, -dayOffset));
      const callDate = dayOffset <= 2 ? assignedDate : (dayOffset === 3 ? dateStr(addDays(now, -1)) : null);
      const callStatus = callDate ? (i % 3 === 0 ? CALL_STATUS.CONNECTED : i % 3 === 1 ? CALL_STATUS.RNR : CALL_STATUS.BUSY) : null;
      const interested = callStatus === CALL_STATUS.CONNECTED ? (i % 2 === 0 ? INTERESTED.YES : INTERESTED.NO) : null;
      const notRemark = interested === INTERESTED.NO && i % 4 === 0 ? 'Location' : interested === INTERESTED.NO && i % 4 === 1 ? 'Salary' : null;
      const intSched = i % 5 === 0 && callStatus === CALL_STATUS.CONNECTED && interested === INTERESTED.YES;
      const intDate = intSched ? dateStr(addDays(now, i % 3)) : null;
      const intStatus = intDate && (i % 4 === 0) ? 'Done' : intDate ? 'Scheduled' : null;
      const turnup = intStatus === 'Done' ? (i % 2 === 0) : null;
      const selStatus = intStatus === 'Done' ? (i % 3 === 0 ? SELECTION.SELECTED : SELECTION.NOT_SELECTED) : null;
      const joinStatus = selStatus === SELECTION.SELECTED ? (i % 4 === 0 ? JOINING.JOINED : i % 4 === 1 ? JOINING.BACKED_OUT : JOINING.PENDING) : null;
      const joinDate = joinStatus === JOINING.JOINED ? (intDate || today) : null;
      const backout = joinStatus === JOINING.BACKED_OUT;
      const backoutDate = backout ? dateStr(addDays(now, -2)) : null;
      const backoutReason = backout ? 'Got another offer' : null;

      appRows.push({
        candidate_id: cid,
        recruiter_id: rec.id,
        job_role_id: jr.id,
        assigned_date: assignedDate,
        call_date: callDate,
        call_status: callStatus,
        interested,
        not_interested_remark: notRemark,
        interview_scheduled: intSched,
        interview_date: intDate,
        turnup,
        interview_status: intStatus,
        selection_status: selStatus,
        joining_status: joinStatus,
        joining_date: joinDate,
        backout_date: backoutDate,
        backout_reason: backoutReason,
        portal: i % 3 === 0 ? 'Naukri' : i % 3 === 1 ? 'WorkIndia' : null,
        notes: 'Seed data for admin dashboard',
      });
    }

    const ensuredMonths = new Set();
    function ensurePartition(assignedDate) {
      const [y, m] = assignedDate.split('-').map(Number);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (ensuredMonths.has(key)) return;
      ensuredMonths.add(key);
      return client.query(
        `SELECT sourcing.create_monthly_partition('applications', $1::date)`,
        [`${y}-${String(m).padStart(2, '0')}-01`]
      );
    }

    let inserted = 0;
    for (const row of appRows) {
      try {
        await ensurePartition(row.assigned_date);
        await client.query(
          `INSERT INTO sourcing.applications (
            candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
            call_status, interested, not_interested_remark, interview_scheduled, interview_date,
            turnup, interview_status, selection_status, joining_status, joining_date,
            backout_date, backout_reason, portal, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            row.candidate_id,
            row.recruiter_id,
            row.job_role_id,
            row.assigned_date,
            row.call_date,
            row.call_status,
            row.interested,
            row.not_interested_remark,
            row.interview_scheduled,
            row.interview_date,
            row.turnup,
            row.interview_status,
            row.selection_status,
            row.joining_status,
            row.joining_date,
            row.backout_date,
            row.backout_reason,
            row.portal,
            row.notes,
          ]
        );
        inserted++;
      } catch (err) {
        if (err.code === '23503') continue; // FK violation skip
        throw err;
      }
    }
    console.log(`Applications inserted: ${inserted}\n`);

    console.log('Done. You can now open Admin Dashboard → Recruiter Performance and try:');
    console.log('  GET /api/admin/recruiter-performance/dod?date=' + today);
    console.log('  GET /api/admin/recruiter-performance/mtd');
    console.log('  GET /api/admin/recruiter-performance/company-wise');
    console.log('  GET /api/admin/recruiter-performance/negative-funnel/not-interested-remarks?date=' + today);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
