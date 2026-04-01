# Testing Recruiter & Application APIs

This document describes how to test the recruiter application APIs and the applications recruiter-call endpoint (the APIs we added/updated for Edit Candidate, call status, and selection sync).

---

## 1. Automated test script

From the project root:

```bash
# Health only (no auth)
node scripts/test-recruiter-application-apis.js

# Full tests (recruiter login + all endpoints)
RECRUITER_EMAIL=z@z.com RECRUITER_PASSWORD=yourpassword node scripts/test-recruiter-application-apis.js

# Or use existing JWT
RECRUITER_TOKEN=<your-jwt> node scripts/test-recruiter-application-apis.js

# Against local server
API_BASE=http://localhost:3000/api RECRUITER_EMAIL=... RECRUITER_PASSWORD=... node scripts/test-recruiter-application-apis.js
```

**Script tests:**

| # | Endpoint | What is checked |
|---|----------|-----------------|
| 1 | `GET /api/recruiter/applications` | 200, list has `source`, `call_status`, `selection_status` |
| 2 | `GET /api/recruiter/applications/:id` | 200, response has new fields (e.g. `notes`, `interview_status`) |
| 3 | `PATCH /api/recruiter/applications/:id` | 200, partial update (e.g. `notes`) persisted |
| 4 | `GET /api/recruiter/dashboard/stats` | 200, has stats keys |
| 5 | `GET /api/applications/pending` | 200, array of pending applications |
| 6 | `PATCH /api/applications/:id/recruiter-call` | 200, call status + interested updated |
| 7 | `PATCH /api/applications/1/recruiter-call` with `callStatus: "call connected"` | 400 (invalid; only "Connected" allowed) |

---

## 2. Get a recruiter JWT

```bash
# Recruiter login (returns access_token)
curl -s -X POST https://api.jobsmato.com/api/auth/recruiter-login \
  -H "Content-Type: application/json" \
  -d '{"email":"z@z.com","password":"YOUR_PASSWORD"}' | jq .
```

Use the `access_token` value as `RECRUITER_TOKEN` or in the `Authorization: Bearer <token>` header.

---

## 3. Manual curl examples

Replace `$TOKEN` with your recruiter JWT.

**List applications (merged sourcing + job portal):**

```bash
curl -s -X GET "https://api.jobsmato.com/api/recruiter/applications" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Get one application:**

```bash
curl -s -X GET "https://api.jobsmato.com/api/recruiter/applications/1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Update application (Edit Candidate – all fields snake_case):**

```bash
curl -s -X PATCH "https://api.jobsmato.com/api/recruiter/applications/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "call_status": "Connected",
    "interested_status": "Yes",
    "selection_status": "Selected",
    "notes": "Test note"
  }' | jq .
```

**Recruiter call (Pending Applications – camelCase):**

```bash
curl -s -X PATCH "https://api.jobsmato.com/api/applications/1/recruiter-call" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "callDate": "2026-02-25",
    "callStatus": "Connected",
    "interested": true
  }' | jq .
```

**Call status must be "Connected" (not "call connected"):**

```bash
# Should return 400 Bad Request
curl -s -X PATCH "https://api.jobsmato.com/api/applications/1/recruiter-call" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callDate":"2026-02-25","callStatus":"call connected","interested":true}' | jq .
```

---

## 4. APIs covered

- **PATCH /api/recruiter/applications/:id** – Full Edit Candidate (snake_case); works for sourcing and job_portal; syncs `selection_status` → job portal `status` (Selected → shortlisted, Not Selected → rejected).
- **GET /api/recruiter/applications** – Merged list with `source`, all new fields.
- **GET /api/recruiter/applications/:id** – Single application with all fields (sourcing or job_portal fallback).
- **PATCH /api/applications/:id/recruiter-call** – Call date, call status (Busy, RNR, Connected, Wrong Number, Switch off), interested (required when Connected); stores "Connected" only.
