/**
 * import-training-candidates.js
 * Imports the cleaned/combined dataset into training_candidates.
 * Upserts by phone (ON CONFLICT) so re-running is safe.
 *
 * Prereqs:  npm install xlsx pg     (pg already present via TypeORM)
 *
 * DB config via env (defaults = local docker):
 *   DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=password DB_NAME=jobsmato_db
 *
 * Run (local):
 *   node scripts/import-training-candidates.js
 *
 * Run (prod — ONLY after explicit approval):
 *   DB_HOST=postgres DB_USER=jobsmato_user DB_PASSWORD=jobsmato_password \
 *   node scripts/import-training-candidates.js
 */
const path = require('path');
let XLSX, Client;
try { XLSX = require('xlsx'); } catch { console.error('Missing dep: npm install xlsx'); process.exit(1); }
try { ({ Client } = require('pg')); } catch { console.error('Missing dep: npm install pg'); process.exit(1); }

const FILE = process.env.IMPORT_FILE || 'D:/down/training_candidates_import.xlsx';
const BATCH_TAG = process.env.BATCH_TAG || 'import_2026_06';
const BATCH_SIZE = 500;

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'jobsmato_db',
};

const S = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

(async () => {
  console.log(`Reading: ${FILE}`);
  const wb = XLSX.readFile(FILE);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  console.log(`Rows to import: ${rows.length}`);
  console.log(`Batch tag: ${BATCH_TAG}`);
  console.log(`DB: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);

  const client = new Client(cfg);
  await client.connect();
  console.log('Connected to DB');

  // Column list for insert
  const cols = [
    'name','phone','email','currentCity','qualification','experience','currentCTC',
    'sourcedForRole','sourcedForCompany','portal','lastRecruiter','lastCallDate',
    'lastCallStatus','lastInterested','lastNotInterestedRemark',
    'lastInterviewStatus','lastSelectionStatus','lastJoiningStatus',
    'status','source','batchTag',
  ];

  const toParams = (r) => [
    S(r.name), S(r.phone), S(r.email), S(r.city), S(r.qualification), S(r.experience), S(r.currentCTC),
    S(r.sourcedForRole), S(r.sourcedForCompany), S(r.portal), S(r.lastRecruiter),
    S(r.lastCallDate), S(r.lastCallStatus), S(r.lastInterested), S(r.notInterestedRemark),
    S(r.lastInterviewStatus), S(r.lastSelectionStatus), S(r.lastJoiningStatus),
    S(r.status) || 'unassigned', `${S(r.sourceFile) || ''}:${S(r.sourceSheet) || ''}`, BATCH_TAG,
  ];

  let imported = 0, updated = 0, skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const slice = rows.slice(i, i + BATCH_SIZE);
    // Build a multi-row INSERT ... ON CONFLICT (phone) DO UPDATE
    const valuesSql = [];
    const params = [];
    let p = 1;
    for (const r of slice) {
      if (!S(r.phone) && !S(r.name)) { skipped++; continue; }
      const ph = toParams(r);
      valuesSql.push(`(${cols.map(() => `$${p++}`).join(',')})`);
      params.push(...ph);
    }
    if (valuesSql.length === 0) continue;

    const quotedCols = cols.map(c => `"${c}"`).join(',');
    const updateSet = cols
      .filter(c => c !== 'phone')   // never overwrite the conflict key
      .map(c => `"${c}" = EXCLUDED."${c}"`)
      .join(',');

    const sql = `
      INSERT INTO training_candidates (${quotedCols})
      VALUES ${valuesSql.join(',')}
      ON CONFLICT ("phone") WHERE "phone" IS NOT NULL
      DO UPDATE SET ${updateSet}, "updatedAt" = now()
      RETURNING (xmax = 0) AS inserted;
    `;
    try {
      const res = await client.query(sql, params);
      for (const row of res.rows) row.inserted ? imported++ : updated++;
    } catch (e) {
      console.error(`Batch ${i} error: ${e.message}`);
    }
    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}  (new: ${imported}, updated: ${updated})`);
    }
  }

  const total = await client.query('SELECT COUNT(*) FROM training_candidates');
  console.log('\n══════════════════════════════════════');
  console.log(`New inserted:  ${imported}`);
  console.log(`Updated:       ${updated}`);
  console.log(`Skipped:       ${skipped}`);
  console.log(`Total in DB:   ${total.rows[0].count}`);
  console.log('══════════════════════════════════════');

  await client.end();
})().catch(e => { console.error(e); process.exit(1); });
