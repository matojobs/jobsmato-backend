/**
 * build_import.js
 * Combine File1 + File2 (clean sheets only, drop Sheet3), dedup by phone,
 * keep most-advanced pipeline record, map to training_candidates import shape.
 *
 * READ-ONLY on source. Writes import file + report to D:/down/.
 * Run: NODE_PATH="E:/Recruiterapp/node_modules" node build_import.js
 */
const XLSX = require('xlsx');
const fs = require('fs');

const FILE1 = 'D:/down/Untitled spreadsheet (3).xlsx';
const FILE2 = 'D:/down/Jobsmato All Over Data.xlsx';
const SKIP_SHEETS = ['Sheet3'];   // broken / column-shifted

const OUT_XLSX   = 'D:/down/training_candidates_import.xlsx';
const OUT_CSV    = 'D:/down/training_candidates_import.csv';
const OUT_REPORT = 'D:/down/training_candidates_import_report.txt';

// ── Known-good call statuses (validation) ──────────────────────────────────
const VALID_CS = {
  'connected':'Connected','rnr':'RNR','ring no response':'RNR','busy':'Busy',
  'switched off':'Switched Off','incoming off':'Incoming Off','call back':'Call Back',
  'callback':'Call Back','invalid':'Invalid','out of network':'Out of network',
  'wrong number':'Wrong Number',
};

const cleanPhone = (v)=>{ if(v==null)return null; const s=String(v).replace(/\D/g,''); return s.length>=10?s.slice(-10):null; };
const cleanStr = (v)=>{ if(v==null)return null; const s=String(v).trim(); return (s===''||['nan','null','none','-','n/a','na'].includes(s.toLowerCase()))?null:s; };
const titleCase = (v)=>{ const s=cleanStr(v); return s?s.replace(/\w\S*/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()):null; };

// Excel serial → ISO date
const excelDate = (v)=>{
  if(v==null) return null;
  if(typeof v==='number' && v>30000 && v<60000){
    const d = new Date(Math.round((v-25569)*86400*1000));
    return isNaN(d)?null:d.toISOString().split('T')[0];
  }
  const s = cleanStr(v); if(!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){ let[_,d,mo,y]=m; if(y.length===2)y='20'+y; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  return s;
};

// pipeline rank for dedup
const RANK = (r)=>{
  const js=(r.joiningStatus||'').toLowerCase(), ss=(r.selectionStatus||'').toLowerCase();
  const ist=(r.interviewStatus||'').toLowerCase(), intr=(r.interested||'').toLowerCase(), cs=(r.callStatus||'').toLowerCase();
  if(js.includes('joined'))return 100;
  if(ss.includes('select'))return 90;
  if(ist.includes('done')||ist.includes('attend'))return 80;
  if(cleanStr(r.interviewScheduled))return 70;
  if(intr.includes('interest')&&!intr.includes('not'))return 60;
  if(cs==='connected')return 50;
  if(cs==='call back')return 40;
  if(['busy','switched off','incoming off','rnr'].includes(cs))return 30;
  if(cs)return 20;
  return 10;
};

function normCS(raw){
  if(!raw) return null;
  const lc=String(raw).trim().toLowerCase();
  return VALID_CS[lc] || null; // null = invalid/misaligned → treated as uncontacted
}

function mapRow(r, sheet, file){
  const phone = cleanPhone(r['Number']);
  return {
    // identity
    name: titleCase(r['Candidate Name']),
    phone,
    email: cleanStr(r['Email ID']),
    city: titleCase(r['Location(City)']),
    qualification: cleanStr(r['Qualification']),
    age: cleanStr(r['Age']),
    experience: cleanStr(r['Work Exp in year']),
    currentCTC: cleanStr(r['Current CTC']),
    // historical sourcing context (preserve — valuable for re-call)
    sourcedForRole: cleanStr(r['Job Role']),
    sourcedForCompany: cleanStr(r['Company Acc']),
    portal: cleanStr(r['Portal']),
    lastRecruiter: cleanStr(r['Recruiter Name']),
    lastCallDate: excelDate(r['Call Date']),
    callStatus: normCS(cleanStr(r['Call Status'])),
    interested: cleanStr(r['Interested']),
    notInterestedRemark: cleanStr(r['Not Interested Remark']),
    interviewScheduled: cleanStr(r['Interview Scheduled']),
    interviewStatus: cleanStr(r['Interview Status']),
    selectionStatus: cleanStr(r['Selection Status']),
    joiningStatus: cleanStr(r['Joining Status']),
    notes: cleanStr(r['Notes']),
    _sheet: sheet,
    _file: file,
  };
}

// ── Collect rows ────────────────────────────────────────────────────────────
const all = [];
let scanned = 0, droppedNoId = 0;

function ingest(file, label){
  const wb = XLSX.readFile(file);
  for(const sheet of wb.SheetNames){
    if(SKIP_SHEETS.includes(sheet.trim())) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval:null });
    for(const r of rows){
      scanned++;
      const m = mapRow(r, sheet.trim(), label);
      if(!m.phone && !m.name){ droppedNoId++; continue; }
      all.push(m);
    }
  }
}

console.log('Ingesting File 1...');
ingest(FILE1, 'F1');
console.log('Ingesting File 2 (skipping Sheet3)...');
ingest(FILE2, 'F2');

// ── Dedup by phone (keep most-advanced) ─────────────────────────────────────
const byPhone = new Map();
const noPhone = [];
for(const r of all){
  if(!r.phone){ noPhone.push(r); continue; }
  const ex = byPhone.get(r.phone);
  if(!ex){ byPhone.set(r.phone, r); continue; }
  if(RANK(r) > RANK(ex)) byPhone.set(r.phone, r);
}
const clean = [...byPhone.values(), ...noPhone];

// ── Derive a "status" for the training_candidates pool ──────────────────────
// Anyone already joined/selected = converted-ish; the rest are callable.
function deriveStatus(r){
  const js=(r.joiningStatus||'').toLowerCase();
  const cs=(r.callStatus||'').toLowerCase();
  const intr=(r.interested||'').toLowerCase();
  if(js.includes('joined')) return 'hired';
  if(cs==='wrong number'||cs==='invalid') return 'unreachable';
  if(intr.includes('not')) return 'talent_pool';   // not interested → talent pool
  return 'unassigned';                              // RNR / busy / uncontacted / interested → callable
}

// ── Build output rows ───────────────────────────────────────────────────────
const out = clean.map(r=>({
  name: r.name, phone: r.phone, email: r.email, city: r.city,
  qualification: r.qualification, age: r.age, experience: r.experience, currentCTC: r.currentCTC,
  sourcedForRole: r.sourcedForRole, sourcedForCompany: r.sourcedForCompany, portal: r.portal,
  lastRecruiter: r.lastRecruiter, lastCallDate: r.lastCallDate,
  lastCallStatus: r.callStatus, lastInterested: r.interested,
  notInterestedRemark: r.notInterestedRemark,
  lastInterviewStatus: r.interviewStatus, lastSelectionStatus: r.selectionStatus,
  lastJoiningStatus: r.joiningStatus, notes: r.notes,
  status: deriveStatus(r),
  sourceFile: r._file, sourceSheet: r._sheet,
}));

// ── Report ──────────────────────────────────────────────────────────────────
let rep = [];
const log = (s='')=>{ rep.push(s); console.log(s); };
log('═══════════════════════════════════════════════════════');
log('TRAINING CANDIDATES IMPORT — BUILD REPORT');
log('Generated: ' + new Date().toISOString());
log('═══════════════════════════════════════════════════════');
log(`Rows scanned (both files, Sheet3 skipped): ${scanned}`);
log(`Dropped (no phone & no name):              ${droppedNoId}`);
log(`Unique phone records:                      ${byPhone.size}`);
log(`Records with no phone (kept):              ${noPhone.length}`);
log(`TOTAL IMPORT RECORDS:                      ${out.length}`);

const statusDist = {};
out.forEach(r=>statusDist[r.status]=(statusDist[r.status]||0)+1);
log('\n── Derived status distribution ──');
Object.entries(statusDist).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>log(`  ${k.padEnd(15)} ${String(v).padStart(7)}`));

const csDist = {};
out.forEach(r=>{ const k=r.lastCallStatus||'(uncontacted)'; csDist[k]=(csDist[k]||0)+1; });
log('\n── Last call status ──');
Object.entries(csDist).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>log(`  ${k.padEnd(20)} ${String(v).padStart(7)}`));

const fileDist = {};
out.forEach(r=>fileDist[r.sourceFile]=(fileDist[r.sourceFile]||0)+1);
log('\n── Source file ──');
Object.entries(fileDist).forEach(([k,v])=>log(`  ${k.padEnd(8)} ${String(v).padStart(7)}`));

log('\n── Data completeness ──');
const pct = (fn)=> (out.filter(fn).length/out.length*100).toFixed(0)+'%';
log(`  Has phone:        ${pct(r=>r.phone)}`);
log(`  Has name:         ${pct(r=>r.name)}`);
log(`  Has city:         ${pct(r=>r.city)}`);
log(`  Has email:        ${pct(r=>r.email)}`);
log(`  Has qualification:${pct(r=>r.qualification)}`);
log(`  Has experience:   ${pct(r=>r.experience)}`);
log(`  Has sourced role: ${pct(r=>r.sourcedForRole)}`);

// ── Write outputs ───────────────────────────────────────────────────────────
const owb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(owb, XLSX.utils.json_to_sheet(out), 'Import');
XLSX.writeFile(owb, OUT_XLSX);
fs.writeFileSync(OUT_CSV, XLSX.utils.sheet_to_csv(owb.Sheets['Import']), 'utf-8');
fs.writeFileSync(OUT_REPORT, rep.join('\n'), 'utf-8');

log('\n═══════════════════════════════════════════════════════');
log('OUTPUT WRITTEN:');
log(`  ${OUT_XLSX}`);
log(`  ${OUT_CSV}`);
log(`  ${OUT_REPORT}`);
log('═══════════════════════════════════════════════════════');
