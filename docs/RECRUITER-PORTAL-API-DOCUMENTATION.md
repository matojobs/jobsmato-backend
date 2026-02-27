# Recruiter Portal API Documentation

## 📋 Overview

This document provides complete API documentation for the **Recruiter Portal**, including all endpoints, request/response formats, and dummy payload examples.

**⚠️ IMPORTANT API CHANGE:** All recruiter endpoints have been moved to `/api/recruiter/*` prefix to avoid conflicts with the Job Portal routes.

---

## 🔄 API Changes Summary

### Before (Deprecated)
- ❌ `POST /api/applications` 
- ❌ `GET /api/applications`
- ❌ `GET /api/companies`
- ❌ `GET /api/dashboard/stats`

### After (Current)
- ✅ `POST /api/recruiter/applications`
- ✅ `GET /api/recruiter/applications`
- ✅ `GET /api/recruiter/companies`
- ✅ `GET /api/recruiter/dashboard/stats`

**All recruiter routes now use `/api/recruiter/*` prefix.**

---

## 🔐 Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

### Get Authentication Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "recruiter@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "recruiter@example.com",
    "role": "recruiter"
  }
}
```

---

## 📦 Field Naming Convention

**All field names use `snake_case` to match frontend spec exactly:**

- ✅ `candidate_id` (not `candidateId`)
- ✅ `job_role_id` (not `jobRoleId`)
- ✅ `call_status` (not `callStatus`)
- ✅ `interested_status` (not `interestedStatus`)
- ✅ `selection_status` (not `selectionStatus`)
- ✅ `joining_status` (not `joiningStatus`)
- ✅ `assigned_date` (not `assignedDate`)
- ✅ `work_exp_years` (not `workExpYears`)
- ✅ `candidate_name` (not `candidateName`)

---

## 🔄 Status Value Mapping

### Call Status
| Frontend (String) | Database (SMALLINT) |
|-------------------|---------------------|
| "Busy"            | 1                   |
| "RNR"             | 2                   |
| "Connected"       | 3                   |
| "Wrong Number"    | 4                   |

### Interested Status
| Frontend (String) | Database (SMALLINT) |
|-------------------|---------------------|
| "Yes"             | 1                   |
| "No"              | 2                   |
| "Call Back Later" | 3                   |

### Selection Status
| Frontend (String) | Database (SMALLINT) |
|-------------------|---------------------|
| "Selected"        | 1                   |
| "Not Selected"    | 2                   |
| "Pending"          | 3                   |

### Joining Status
| Frontend (String) | Database (SMALLINT) |
|-------------------|---------------------|
| "Joined"          | 1                   |
| "Not Joined"      | 2                   |
| "Pending"          | 3                   |
| "Backed Out"       | 4                   |

**Note:** Backend automatically converts between string values (frontend) and SMALLINT (database). Always send string values in API requests.

---

## 📡 API Endpoints

### 1. Master Data Endpoints

#### 1.1 Get All Recruiters

```http
GET /api/recruiter/recruiters
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "John Recruiter",
    "email": "john@recruiter.com",
    "phone": "+91 9876543210",
    "is_active": true,
    "created_at": "2026-02-01T10:00:00.000Z",
    "updated_at": "2026-02-01T10:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Jane Recruiter",
    "email": "jane@recruiter.com",
    "phone": "+91 9876543211",
    "is_active": true,
    "created_at": "2026-02-02T10:00:00.000Z",
    "updated_at": "2026-02-02T10:00:00.000Z"
  }
]
```

---

#### 1.2 Get All Companies

```http
GET /api/recruiter/companies
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Tech Corp",
    "slug": "tech-corp",
    "description": "Leading technology company",
    "website": "https://techcorp.com",
    "industry": "Technology",
    "job_roles_count": 5
  },
  {
    "id": 2,
    "name": "StartupXYZ",
    "slug": "startupxyz",
    "description": "Innovative software startup",
    "website": "https://startupxyz.com",
    "industry": "Software",
    "job_roles_count": 3
  }
]
```

**Note:** Response now includes `job_roles_count` showing how many active job roles exist for each company.

---

#### 1.2a Get Company by ID (with Job Roles)

```http
GET /api/recruiter/companies/1
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Tech Corp",
  "slug": "tech-corp",
  "description": "Leading technology company",
  "website": "https://techcorp.com",
  "industry": "Technology",
  "job_roles": [
    {
      "id": 1,
      "company_id": 1,
      "role_name": "Software Engineer",
      "department": "Engineering",
      "is_active": true
    },
    {
      "id": 2,
      "company_id": 1,
      "role_name": "Product Manager",
      "department": "Product",
      "is_active": true
    }
  ],
  "job_roles_count": 2
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Company with ID 1 not found",
  "error": "Not Found"
}
```

---

#### 1.3 Get Job Roles (with Company Details)

```http
GET /api/recruiter/job-roles?company_id=1
Authorization: Bearer <TOKEN>
```

**Query Parameters:**
- `company_id` (optional): Filter by company ID

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "company_id": 1,
    "role_name": "Software Engineer",
    "department": "Engineering",
    "is_active": true,
    "company": {
      "id": 1,
      "name": "Tech Corp",
      "slug": "tech-corp",
      "description": "Leading technology company",
      "website": "https://techcorp.com",
      "industry": "Technology"
    }
  },
  {
    "id": 2,
    "company_id": 1,
    "role_name": "Product Manager",
    "department": "Product",
    "is_active": true,
    "company": {
      "id": 1,
      "name": "Tech Corp",
      "slug": "tech-corp",
      "description": "Leading technology company",
      "website": "https://techcorp.com",
      "industry": "Technology"
    }
  }
]
```

**Note:** Each job role now includes full `company` details, so recruiters can see which company each role belongs to.

---

#### 1.3a Get Job Role by ID (with Company Details)

```http
GET /api/recruiter/job-roles/1
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "company_id": 1,
  "role_name": "Software Engineer",
  "department": "Engineering",
  "is_active": true,
  "company": {
    "id": 1,
    "name": "Tech Corp",
    "slug": "tech-corp",
    "description": "Leading technology company",
    "website": "https://techcorp.com",
    "industry": "Technology"
  }
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Job role with ID 1 not found",
  "error": "Not Found"
}
```

---

#### 1.4 Create Job Role

```http
POST /api/recruiter/job-roles
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "company_id": 1,
  "role_name": "Senior Software Engineer",
  "department": "Engineering"
}
```

**Request Payload:**
```json
{
  "company_id": 1,
  "role_name": "Senior Software Engineer",
  "department": "Engineering"
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "company_id": 1,
  "role_name": "Senior Software Engineer",
  "department": "Engineering",
  "created_at": "2026-02-19T12:00:00.000Z"
}
```

---

#### 1.5 Get Candidates

```http
GET /api/recruiter/candidates?search=john
Authorization: Bearer <TOKEN>
```

**Query Parameters:**
- `search` (optional): Search by name, phone, or email

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "candidate_name": "John Doe",
    "phone": "+91 9876543210",
    "email": "john@example.com",
    "qualification": "B.Tech",
    "work_exp_years": 5,
    "portal_id": 1,
    "created_at": "2026-02-01T10:00:00.000Z"
  },
  {
    "id": 2,
    "candidate_name": "Jane Smith",
    "phone": "+91 9876543211",
    "email": "jane@example.com",
    "qualification": "M.Tech",
    "work_exp_years": 3,
    "portal_id": 1,
    "created_at": "2026-02-02T10:00:00.000Z"
  }
]
```

---

#### 1.6 Create Candidate

```http
POST /api/recruiter/candidates
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "candidate_name": "Alice Johnson",
  "phone": "+91 9876543212",
  "email": "alice@example.com",
  "qualification": "B.Tech Computer Science",
  "work_exp_years": 4,
  "portal_id": 1
}
```

**Request Payload:**
```json
{
  "candidate_name": "Alice Johnson",
  "phone": "+91 9876543212",
  "email": "alice@example.com",
  "qualification": "B.Tech Computer Science",
  "work_exp_years": 4,
  "portal_id": 1
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "candidate_name": "Alice Johnson",
  "phone": "+91 9876543212",
  "email": "alice@example.com",
  "qualification": "B.Tech Computer Science",
  "work_exp_years": 4,
  "portal_id": 1,
  "created_at": "2026-02-19T12:00:00.000Z"
}
```

---

### 2. Applications CRUD

#### 2.1 Get Applications (with filters)

```http
GET /api/recruiter/applications?page=1&limit=20&call_status=Connected&interested_status=Yes&job_role_id=1
Authorization: Bearer <TOKEN>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Page size
- `recruiter_id` (optional): Filter by recruiter ID
- `job_role_id` (optional): Filter by job role ID
- `company_id` (optional): Filter by company ID
- `call_status` (optional): Filter by call status ("Busy", "RNR", "Connected", "Wrong Number")
- `interested_status` (optional): Filter by interested status ("Yes", "No", "Call Back Later")
- `selection_status` (optional): Filter by selection status ("Selected", "Not Selected", "Pending")
- `joining_status` (optional): Filter by joining status ("Joined", "Not Joined", "Pending", "Backed Out")
- `start_date` (optional): Filter from date (ISO format: "2026-02-01")
- `end_date` (optional): Filter to date (ISO format: "2026-02-28")

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "recruiter_id": 1,
    "candidate_id": 1,
    "job_role_id": 1,
    "assigned_date": "2026-02-05",
    "call_date": "2026-02-06",
    "call_status": "Connected",
    "interested_status": "Yes",
    "selection_status": "Selected",
    "joining_status": "Pending",
    "notes": "Candidate showed strong interest",
    "created_at": "2026-02-05T10:00:00.000Z",
    "updated_at": "2026-02-06T10:00:00.000Z",
    "candidate": {
      "id": 1,
      "candidate_name": "John Doe",
      "phone": "+91 9876543210",
      "email": "john@example.com"
    },
    "job_role": {
      "id": 1,
      "role_name": "Software Engineer",
      "company_id": 1
    },
    "company": {
      "id": 1,
      "name": "Tech Corp"
    }
  }
]
```

---

#### 2.2 Get Application by ID

```http
GET /api/recruiter/applications/1
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "recruiter_id": 1,
  "candidate_id": 1,
  "job_role_id": 1,
  "assigned_date": "2026-02-05",
  "call_date": "2026-02-06",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Selected",
  "joining_status": "Pending",
  "notes": "Candidate showed strong interest",
  "created_at": "2026-02-05T10:00:00.000Z",
  "updated_at": "2026-02-06T10:00:00.000Z",
  "candidate": {
    "id": 1,
    "candidate_name": "John Doe",
    "phone": "+91 9876543210",
    "email": "john@example.com",
    "qualification": "B.Tech",
    "work_exp_years": 5
  },
  "job_role": {
    "id": 1,
    "role_name": "Software Engineer",
    "department": "Engineering",
    "company_id": 1
  },
  "company": {
    "id": 1,
    "name": "Tech Corp",
    "industry": "Technology"
  },
  "recruiter": {
    "id": 1,
    "name": "John Recruiter",
    "email": "john@recruiter.com"
  }
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Application not found",
  "error": "Not Found"
}
```

---

#### 2.3 Create Application

```http
POST /api/recruiter/applications
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "candidate_id": 1,
  "job_role_id": 1,
  "assigned_date": "2026-02-19",
  "call_date": "2026-02-20",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Pending",
  "joining_status": "Pending",
  "notes": "Initial contact made, candidate interested"
}
```

**Request Payload:**
```json
{
  "candidate_id": 1,
  "job_role_id": 1,
  "assigned_date": "2026-02-19",
  "call_date": "2026-02-20",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Pending",
  "joining_status": "Pending",
  "notes": "Initial contact made, candidate interested"
}
```

**Required Fields:**
- `candidate_id` (number): ID of the candidate
- `job_role_id` (number): ID of the job role
- `assigned_date` (string, ISO date): Date when application was assigned

**Optional Fields:**
- `call_date` (string, ISO date): Date of the call
- `call_status` (string): "Busy", "RNR", "Connected", "Wrong Number"
- `interested_status` (string): "Yes", "No", "Call Back Later"
- `selection_status` (string): "Selected", "Not Selected", "Pending"
- `joining_status` (string): "Joined", "Not Joined", "Pending", "Backed Out"
- `notes` (string): Additional notes

**Response (201 Created):**
```json
{
  "id": 2,
  "recruiter_id": 1,
  "candidate_id": 1,
  "job_role_id": 1,
  "assigned_date": "2026-02-19",
  "call_date": "2026-02-20",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Pending",
  "joining_status": "Pending",
  "notes": "Initial contact made, candidate interested",
  "created_at": "2026-02-19T12:00:00.000Z",
  "updated_at": "2026-02-19T12:00:00.000Z"
}
```

**Response (400 Bad Request - Duplicate):**
```json
{
  "statusCode": 400,
  "message": "Application already exists for this candidate, job role, and assigned date",
  "error": "Bad Request"
}
```

**Response (400 Bad Request - Validation Error):**
```json
{
  "statusCode": 400,
  "message": [
    "candidate_id must be a number conforming to the specified constraints",
    "assigned_date must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

---

#### 2.4 Update Application

```http
PATCH /api/recruiter/applications/1
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Selected",
  "joining_status": "Pending",
  "notes": "Updated: Candidate passed interview"
}
```

**Request Payload (all fields optional):**
```json
{
  "call_date": "2026-02-21",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Selected",
  "joining_status": "Pending",
  "notes": "Updated: Candidate passed interview"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "recruiter_id": 1,
  "candidate_id": 1,
  "job_role_id": 1,
  "assigned_date": "2026-02-05",
  "call_date": "2026-02-21",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Selected",
  "joining_status": "Pending",
  "notes": "Updated: Candidate passed interview",
  "created_at": "2026-02-05T10:00:00.000Z",
  "updated_at": "2026-02-19T12:00:00.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Application not found",
  "error": "Not Found"
}
```

---

#### 2.5 Delete Application

```http
DELETE /api/recruiter/applications/1
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
{
  "message": "Application deleted successfully"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Application not found",
  "error": "Not Found"
}
```

---

### 3. Dashboard Endpoints

#### 3.1 Get Dashboard Statistics

```http
GET /api/recruiter/dashboard/stats
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
{
  "total_applications": 150,
  "total_candidates": 120,
  "total_calls": 200,
  "avg_calls_per_day": 6.67,
  "connected_calls": 150,
  "interested_candidates": 80,
  "selected_candidates": 45,
  "joined_candidates": 30,
  "conversion_rate": 20.0,
  "call_to_interest_rate": 53.33,
  "interest_to_selection_rate": 56.25,
  "selection_to_join_rate": 66.67
}
```

---

#### 3.2 Get Pipeline Breakdown

```http
GET /api/recruiter/dashboard/pipeline
Authorization: Bearer <TOKEN>
```

**Response (200 OK):**
```json
[
  {
    "stage": "New Applications",
    "count": 25
  },
  {
    "stage": "Contacted",
    "count": 30
  },
  {
    "stage": "Interested",
    "count": 20
  },
  {
    "stage": "Interview Scheduled",
    "count": 15
  },
  {
    "stage": "Selected",
    "count": 10
  },
  {
    "stage": "Joined",
    "count": 8
  },
  {
    "stage": "Not Interested",
    "count": 12
  },
  {
    "stage": "Rejected",
    "count": 10
  }
]
```

---

#### 3.3 Get Recruiter Performance Report

```http
GET /api/recruiter/reports/recruiter-performance?start_date=2026-02-01&end_date=2026-02-28
Authorization: Bearer <TOKEN>
```

**Query Parameters:**
- `start_date` (optional): Start date (ISO format: "2026-02-01")
- `end_date` (optional): End date (ISO format: "2026-02-28")

**Response (200 OK):**
```json
{
  "recruiter_id": 1,
  "recruiter_name": "John Recruiter",
  "period": {
    "start_date": "2026-02-01",
    "end_date": "2026-02-28"
  },
  "metrics": {
    "total_applications": 150,
    "total_calls": 200,
    "connected_calls": 150,
    "interested_candidates": 80,
    "selected_candidates": 45,
    "joined_candidates": 30,
    "conversion_rate": 20.0,
    "avg_calls_per_day": 6.67
  },
  "daily_breakdown": [
    {
      "date": "2026-02-01",
      "applications": 5,
      "calls": 8,
      "interested": 3,
      "selected": 2
    },
    {
      "date": "2026-02-02",
      "applications": 7,
      "calls": 10,
      "interested": 5,
      "selected": 3
    }
  ]
}
```

**Response (404 Not Found - No Data):**
```json
{
  "statusCode": 404,
  "message": "No performance data found for the specified period",
  "error": "Not Found"
}
```

---

## ✅ Requirements Fulfillment Checklist

### ✅ Module Architecture
- [x] Separate NestJS module: `/modules/recruiter`
- [x] Controller, Service, Module files
- [x] DTOs, Guards, Enums, Mappers, Interfaces
- [x] Only accesses `sourcing` schema

### ✅ Role Guard
- [x] `@UseGuards(JwtAuthGuard, RecruiterGuard)`
- [x] Roles decorator and RolesGuard
- [x] JWT validation
- [x] Role extracted from JWT
- [x] Recruiters cannot access job portal/admin APIs

### ✅ Exact Payload Contract
- [x] All field names use `snake_case` (candidate_name, phone, qualification, etc.)
- [x] No camelCase transformation
- [x] Backend returns exact same key names as frontend spec

### ✅ Internal Status Mapping
- [x] Database uses SMALLINT
- [x] Frontend uses string values
- [x] Internal enum mapping implemented
- [x] Conversion happens in service layer
- [x] Never exposes integers to frontend

### ✅ All Endpoints Implemented
- [x] Master Data: GET recruiters, companies, job-roles, candidates
- [x] Master Data: POST job-roles, candidates
- [x] Applications: GET (list), GET (by ID), POST, PATCH, DELETE
- [x] Dashboard: GET stats, GET pipeline
- [x] Reports: GET recruiter-performance
- [x] Nested relations: recruiter, candidate, job_role, company

### ✅ Data Protection Rules
- [x] Duplicate check: (candidate_id, job_role_id, assigned_date)
- [x] Returns 400 with error on duplicate
- [x] Recruiters cannot modify other recruiter's applications
- [x] All queries use safe parameter binding

### ✅ Sub-Service Ready
- [x] Separate environment config
- [x] No tight coupling to job portal module
- [x] No cross-schema writes
- [x] Can be extracted to separate service

### ✅ Dashboard Query Optimization
- [x] Uses partition pruning
- [x] Uses indexes
- [x] Uses materialized views for stats
- [x] Does NOT aggregate raw tables directly

### ✅ Response Format
- [x] 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Internal Server Error
- [x] Error format: `{ "error": "Human readable message" }`
- [x] No nested error objects

### ✅ Validation
- [x] Uses class-validator
- [x] DTO validation
- [x] Strict type enforcement
- [x] Date format validation (ISO only)
- [x] Rejects malformed payloads

---

## 🚨 Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Human readable error message",
  "error": "Bad Request",
  "timestamp": "2026-02-19T12:00:00.000Z",
  "path": "/api/recruiter/applications"
}
```

**Common Error Codes:**
- `400 Bad Request` - Validation error, duplicate application
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Not a recruiter or inactive account
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 📝 Notes

1. **Route Isolation**: All recruiter routes are under `/api/recruiter/*` prefix
2. **No Conflicts**: Job portal routes (`/api/applications`, `/api/jobs`, etc.) remain unchanged
3. **Backward Compatible**: Job portal frontend continues to work without changes
4. **Breaking Change**: Only affects recruiter frontend (must use `/api/recruiter/*` prefix)
5. **Status Values**: Always send string values ("Connected", "Yes", etc.), backend handles conversion
6. **Date Format**: All dates must be ISO 8601 format (YYYY-MM-DD)

---

## 🔗 Related Documentation

- [Recruiter Module Setup](./src/modules/recruiter/RECRUITER-MODULE-SETUP.md)
- [API Routes Summary](./API-ROUTES-SUMMARY.md)
- [Sourcing DataLake Architecture](./SOURCING-DATALAKE-ARCHITECTURE.md)

---

**Last Updated:** 2026-02-19  
**API Version:** 1.0  
**Base URL:** `https://api.jobsmato.com/api/recruiter` (production) or `http://localhost:5000/api/recruiter` (local)
