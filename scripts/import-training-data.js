/**
 * Import training candidates from Excel into training_candidates table
 * Run: node scripts/import-training-data.js
 */
const XLSX = require('../node_modules/.bin/../xlsx') || require('xlsx');
const { Client } = require('pg');
const path = require('path');

// Excel serial date → JS Date
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  // Excel epoch: Dec 30 1899. Also has the leap-year-1900 bug (+1 offset)
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function cleanStr(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// Title-case a string
function titleCase(s) {
  if (!s) return s;
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function cleanName(val) {
  const s = cleanStr(val);
  if (!s) return null;
  return titleCase(s);
}

function cleanPhone(val) {
  if (val == null) return null;
  const s = String(val).replace(/\D/g, '').trim();
  return s.length >= 8 ? s.slice(-10) : null;
}

function cleanStatus(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  const map = {
    connected: 'Connected',
    rnr: 'RNR',
    'ring no response': 'RNR',
    busy: 'Busy',
    'switched off': 'Switched Off',
    'incoming off': 'Incoming Off',
    'call back': 'Call Back',
    invalid: 'Invalid',
    'wrong number': 'Wrong Number',
    'out of network': 'Out of Network',
    'not interested': 'Not Interested',
    interested: 'Interested',
  };
  return map[s] || titleCase(s);
}

function cleanCity(val) {
  const s = cleanStr(val);
  if (!s) return null;
  return titleCase(s);
}

async function main() {
  // Load Excel
  const filePath = path.resolve('D:/down/Untitled spreadsheet (3).xlsx');
  console.log('Reading:', filePath);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const dataRows = allRows.slice(1).filter(r => r && r[5]); // skip header, skip rows without name
  console.log('Data rows to import:', dataRows.length);

  // Connect to DB
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'jobsmato_db',
  });
  await client.connect();
  console.log('DB connected');

  // Clear existing data (except the 1 test row if any)
  await client.query('TRUNCATE TABLE training_candidates RESTART IDENTITY CASCADE');
  console.log('Table cleared');

  // Map column indices from header
  // ["Portal","Job Role","Company Acc","Assigned Date","Recruiter Name","Candidate Name",
  //  "Number","Call Date","Call Status","Interested","Qualification","Age","Location(City)",
  //  "Work Exp in year","Not Interested Remark","Interview Scheduled","Turnup","Interview Status",
  //  "Selection Status","Joining Status","Joining Date","Hiring Manager Feedback","Followup Date","Notes",...]
  const COL = {
    source: 0,
    jobRole: 1,
    company: 2,
    name: 5,
    phone: 6,
    callStatus: 8,
    interested: 9,
    qualification: 10,
    age: 11,
    city: 12,
    experience: 13,
    notInterestedRemark: 14,
    notes: 23,
  };

  const INSERT_SQL = `
    INSERT INTO training_candidates
      (name, phone, "currentCity", qualification, experience, "currentCompany",
       "currentDesignation", source, status, remarks, "createdAt", "updatedAt")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
  `;

  let imported = 0;
  let skipped = 0;
  const BATCH = 500;

  for (let i = 0; i < dataRows.length; i += BATCH) {
    const batch = dataRows.slice(i, i + BATCH);
    const promises = batch.map(async row => {
      const name = cleanName(row[COL.name]);
      if (!name) { skipped++; return; }

      const phone = cleanPhone(row[COL.phone]);
      const city = cleanCity(row[COL.city]);
      const qual = cleanStr(row[COL.qualification]);
      const exp = cleanStr(row[COL.experience]);
      const company = cleanStr(row[COL.company]);
      const jobRole = cleanStr(row[COL.jobRole]);
      const source = cleanStr(row[COL.source]);
      const status = cleanStatus(row[COL.callStatus]);

      // Combine remark + notes
      const remark = cleanStr(row[COL.notInterestedRemark]);
      const notes = cleanStr(row[COL.notes]);
      const remarks = [remark, notes].filter(Boolean).join(' | ') || null;

      try {
        await client.query(INSERT_SQL, [name, phone, city, qual, exp, company, jobRole, source, status, remarks]);
        imported++;
      } catch (e) {
        skipped++;
      }
    });
    await Promise.all(promises);
    if ((i + BATCH) % 5000 === 0 || i + BATCH >= dataRows.length) {
      console.log(`Progress: ${Math.min(i + BATCH, dataRows.length)} / ${dataRows.length} | imported: ${imported} | skipped: ${skipped}`);
    }
  }

  // Final count
  const { rows } = await client.query('SELECT COUNT(*) FROM training_candidates');
  console.log('\nDone! Total in DB:', rows[0].count);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
