"""
clean_training_data.py
----------------------
Cleans and deduplicates the 80k recruitment Excel file.

Usage:
    pip install pandas openpyxl xlrd
    python clean_training_data.py

Input:  D:/down/Untitled spreadsheet (3).xlsx
Output: D:/down/training_data_cleaned.xlsx
        D:/down/training_data_cleaned.csv
        D:/down/cleaning_report.txt
"""

import pandas as pd
import re
import os
from datetime import datetime, timedelta

INPUT_FILE  = r"D:/down/Untitled spreadsheet (3).xlsx"
OUTPUT_XLSX = r"D:/down/training_data_cleaned.xlsx"
OUTPUT_CSV  = r"D:/down/training_data_cleaned.csv"
REPORT_FILE = r"D:/down/cleaning_report.txt"

# ── Helpers ────────────────────────────────────────────────────────────────────

def clean_phone(val):
    if pd.isna(val):
        return None
    s = re.sub(r'\D', '', str(val)).strip()
    # Take last 10 digits
    if len(s) >= 10:
        s = s[-10:]
    return s if len(s) == 10 else None

def clean_str(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    return s if s and s.lower() not in ('nan', 'none', 'null', '-', 'n/a', 'na') else None

def title_case(val):
    s = clean_str(val)
    if not s:
        return None
    return ' '.join(w.capitalize() for w in s.split())

def clean_name(val):
    return title_case(val)

def clean_company(val):
    s = clean_str(val)
    if not s:
        return None
    # Normalize common abbreviations
    s = re.sub(r'\bPvt\.?\s*Ltd\.?\b', 'Pvt Ltd', s, flags=re.IGNORECASE)
    s = re.sub(r'\bLtd\.?\b', 'Ltd', s, flags=re.IGNORECASE)
    return ' '.join(w.capitalize() for w in s.split())

def clean_city(val):
    return title_case(val)

def excel_date(val):
    """Convert Excel serial date number to ISO string."""
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        try:
            dt = datetime(1899, 12, 30) + timedelta(days=float(val))
            return dt.strftime('%Y-%m-%d')
        except Exception:
            return None
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    s = clean_str(val)
    if not s:
        return None
    for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%m/%d/%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None

def clean_experience(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    # Extract first number
    m = re.search(r'(\d+(?:\.\d+)?)', s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None

def clean_salary(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    if s.lower() in ('nan', 'none', '-', 'n/a'):
        return None
    return s

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print(f"Reading: {INPUT_FILE}")
    df = pd.read_excel(INPUT_FILE, dtype=str)

    original_count = len(df)
    print(f"Original rows: {original_count}")
    print(f"Columns: {list(df.columns)}")

    # ── Normalise column names ─────────────────────────────────────────────
    df.columns = [c.strip().lower().replace(' ', '_').replace('/', '_') for c in df.columns]
    print(f"\nNormalised columns: {list(df.columns)}")

    # ── Map to our schema ──────────────────────────────────────────────────
    # Try to auto-detect column names (handles variations in the Excel headers)
    col_map = {}
    for col in df.columns:
        lc = col.lower()
        if 'name' in lc and 'company' not in lc and 'candidate' not in lc:
            col_map.setdefault('name', col)
        elif 'phone' in lc or 'mobile' in lc or 'contact' in lc:
            col_map.setdefault('phone', col)
        elif 'email' in lc:
            col_map.setdefault('email', col)
        elif 'current_city' in lc or ('city' in lc and 'native' not in lc):
            col_map.setdefault('currentCity', col)
        elif 'native' in lc and 'city' in lc:
            col_map.setdefault('nativeCity', col)
        elif 'qualification' in lc or 'education' in lc:
            col_map.setdefault('qualification', col)
        elif 'specialization' in lc or 'stream' in lc:
            col_map.setdefault('specialization', col)
        elif 'passing' in lc or 'pass_year' in lc or 'year' in lc:
            col_map.setdefault('passingYear', col)
        elif 'experience' in lc or 'exp' in lc:
            col_map.setdefault('experience', col)
        elif 'current_company' in lc or ('company' in lc and 'current' in lc):
            col_map.setdefault('currentCompany', col)
        elif 'company' in lc:
            col_map.setdefault('currentCompany', col)
        elif 'designation' in lc or 'role' in lc or 'position' in lc or 'profile' in lc:
            col_map.setdefault('currentDesignation', col)
        elif 'current_ctc' in lc or ('ctc' in lc and 'expected' not in lc):
            col_map.setdefault('currentCTC', col)
        elif 'expected_ctc' in lc or ('ctc' in lc and 'expected' in lc):
            col_map.setdefault('expectedCTC', col)
        elif 'notice' in lc:
            col_map.setdefault('noticePeriod', col)
        elif 'skill' in lc:
            col_map.setdefault('skills', col)
        elif 'source' in lc:
            col_map.setdefault('source', col)
        elif 'status' in lc and 'call' not in lc:
            col_map.setdefault('status', col)
        elif 'remark' in lc or 'note' in lc or 'comment' in lc:
            col_map.setdefault('remarks', col)
        elif 'language' in lc:
            col_map.setdefault('language', col)
        elif 'english' in lc or 'proficiency' in lc:
            col_map.setdefault('engProficiency', col)
        elif 'dob' in lc or 'birth' in lc:
            col_map.setdefault('dob', col)
        elif 'gender' in lc:
            col_map.setdefault('gender', col)

    print(f"\nDetected column mapping: {col_map}")

    # ── Build cleaned dataframe ────────────────────────────────────────────
    out = pd.DataFrame()

    out['name']             = df.get(col_map.get('name', ''), pd.Series(dtype=str)).apply(clean_name)
    out['phone']            = df.get(col_map.get('phone', ''), pd.Series(dtype=str)).apply(clean_phone)
    out['email']            = df.get(col_map.get('email', ''), pd.Series(dtype=str)).apply(clean_str)
    out['currentCity']      = df.get(col_map.get('currentCity', ''), pd.Series(dtype=str)).apply(clean_city)
    out['nativeCity']       = df.get(col_map.get('nativeCity', ''), pd.Series(dtype=str)).apply(clean_city)
    out['qualification']    = df.get(col_map.get('qualification', ''), pd.Series(dtype=str)).apply(title_case)
    out['specialization']   = df.get(col_map.get('specialization', ''), pd.Series(dtype=str)).apply(title_case)
    out['passingYear']      = df.get(col_map.get('passingYear', ''), pd.Series(dtype=str)).apply(clean_str)
    out['experience']       = df.get(col_map.get('experience', ''), pd.Series(dtype=str)).apply(clean_experience)
    out['currentCompany']   = df.get(col_map.get('currentCompany', ''), pd.Series(dtype=str)).apply(clean_company)
    out['currentDesignation']= df.get(col_map.get('currentDesignation', ''), pd.Series(dtype=str)).apply(title_case)
    out['currentCTC']       = df.get(col_map.get('currentCTC', ''), pd.Series(dtype=str)).apply(clean_salary)
    out['expectedCTC']      = df.get(col_map.get('expectedCTC', ''), pd.Series(dtype=str)).apply(clean_salary)
    out['noticePeriod']     = df.get(col_map.get('noticePeriod', ''), pd.Series(dtype=str)).apply(clean_str)
    out['skills']           = df.get(col_map.get('skills', ''), pd.Series(dtype=str)).apply(clean_str)
    out['source']           = df.get(col_map.get('source', ''), pd.Series(dtype=str)).apply(clean_str)
    out['remarks']          = df.get(col_map.get('remarks', ''), pd.Series(dtype=str)).apply(clean_str)
    out['language']         = df.get(col_map.get('language', ''), pd.Series(dtype=str)).apply(clean_str)
    out['engProficiency']   = df.get(col_map.get('engProficiency', ''), pd.Series(dtype=str)).apply(clean_str)
    out['dob']              = df.get(col_map.get('dob', ''), pd.Series(dtype=str)).apply(excel_date)
    out['gender']           = df.get(col_map.get('gender', ''), pd.Series(dtype=str)).apply(clean_str)

    # ── Drop rows with no phone AND no name ────────────────────────────────
    before_empty = len(out)
    out = out[~(out['phone'].isna() & out['name'].isna())]
    dropped_empty = before_empty - len(out)

    # ── Deduplicate by phone (keep first occurrence) ────────────────────────
    before_dedup = len(out)
    has_phone = out[out['phone'].notna()].copy()
    no_phone  = out[out['phone'].isna()].copy()

    has_phone = has_phone.drop_duplicates(subset=['phone'], keep='first')
    out = pd.concat([has_phone, no_phone], ignore_index=True)
    dropped_dups = before_dedup - len(out)

    # ── Sort by company → designation → city ───────────────────────────────
    out = out.sort_values(
        by=['currentCompany', 'currentDesignation', 'currentCity'],
        na_position='last'
    ).reset_index(drop=True)

    # ── Summary stats ──────────────────────────────────────────────────────
    final_count = len(out)
    companies   = out['currentCompany'].nunique()
    designations = out['currentDesignation'].nunique()
    cities      = out['currentCity'].nunique()
    with_phone  = out['phone'].notna().sum()
    with_email  = out['email'].notna().sum()

    report = f"""
CLEANING REPORT — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*60}
Original rows          : {original_count:,}
Dropped (no name+phone): {dropped_empty:,}
Dropped (phone dupes)  : {dropped_dups:,}
FINAL rows             : {final_count:,}

Data quality:
  With phone number    : {with_phone:,} ({with_phone/final_count*100:.1f}%)
  With email           : {with_email:,} ({with_email/final_count*100:.1f}%)
  Unique companies     : {companies:,}
  Unique designations  : {designations:,}
  Unique cities        : {cities:,}

Top 10 Companies:
{out['currentCompany'].value_counts().head(10).to_string()}

Top 10 Designations:
{out['currentDesignation'].value_counts().head(10).to_string()}

Top 10 Cities:
{out['currentCity'].value_counts().head(10).to_string()}
"""
    print(report)

    # ── Write outputs ──────────────────────────────────────────────────────
    out.to_excel(OUTPUT_XLSX, index=False)
    out.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\nSaved cleaned data: {OUTPUT_XLSX}")
    print(f"Saved CSV:          {OUTPUT_CSV}")
    print(f"Saved report:       {REPORT_FILE}")

if __name__ == '__main__':
    main()
