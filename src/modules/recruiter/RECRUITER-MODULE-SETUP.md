# Recruiter Module Setup Guide

**⚠️ IMPORTANT:** All recruiter API routes use `/api/recruiter/*` prefix (not `/api/*`).

## Quick Start

### 1. Prerequisites

- ✅ NestJS application running
- ✅ PostgreSQL database with `sourcing` schema
- ✅ User accounts with `UserRole.RECRUITER`
- ✅ Recruiter records in `sourcing.recruiters` table matching user emails

### 2. Module Registration

The module is already registered in `app.module.ts`:

```typescript
import { RecruiterModule } from './modules/recruiter/recruiter.module';
// ...
imports: [
  // ...
  RecruiterModule,
]
```

### 3. Database Setup

Ensure recruiter records exist:

```sql
-- Create recruiter record (email must match user.email)
INSERT INTO sourcing.recruiters (name, email, phone, is_active, created_at, updated_at)
VALUES ('John Recruiter', 'recruiter@example.com', '+91 9876543210', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

### 4. User Setup

Create user with recruiter role:

```sql
-- User must have role = 'recruiter' and email matching recruiter.email
INSERT INTO users (email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
VALUES ('recruiter@example.com', '$2b$10$hashedpassword', 'John', 'Recruiter', 'recruiter', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

### 5. Authentication

All endpoints require JWT authentication:

```bash
# Login to get token
POST /api/auth/login
{
  "email": "recruiter@example.com",
  "password": "password"
}

# Use token in requests
Authorization: Bearer <JWT_TOKEN>
```

## API Testing Examples

### Create Application

```bash
curl -X POST http://localhost:5000/api/recruiter/applications \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": 1,
    "job_role_id": 5,
    "assigned_date": "2026-02-05",
    "call_status": "Connected",
    "interested_status": "Yes"
  }'
```

### Get Applications with Filters

```bash
curl -X GET "http://localhost:5000/api/recruiter/applications?page=1&limit=20&call_status=Connected&interested_status=Yes" \
  -H "Authorization: Bearer <TOKEN>"
```

### Get Dashboard Stats

```bash
curl -X GET http://localhost:5000/api/recruiter/dashboard/stats \
  -H "Authorization: Bearer <TOKEN>"
```

### Get Companies

```bash
curl -X GET http://localhost:5000/api/recruiter/companies \
  -H "Authorization: Bearer <TOKEN>"
```

### Get Job Roles

```bash
curl -X GET http://localhost:5000/api/recruiter/job-roles \
  -H "Authorization: Bearer <TOKEN>"
```

### Get Candidates

```bash
curl -X GET http://localhost:5000/api/recruiter/candidates \
  -H "Authorization: Bearer <TOKEN>"
```

## Field Name Mapping

**Important:** All field names use snake_case to match frontend exactly:

- `candidate_id` (not `candidateId`)
- `call_status` (not `callStatus`)
- `interested_status` (not `interestedStatus`)
- `selection_status` (not `selectionStatus`)
- `joining_status` (not `joiningStatus`)
- `assigned_date` (not `assignedDate`)
- `work_exp_years` (not `workExpYears`)

## Status Value Mapping

### Database → Frontend

| Database (SMALLINT) | Frontend (String) |
|---------------------|-------------------|
| 1                   | "Busy"            |
| 2                   | "RNR"             |
| 3                   | "Connected"       |
| 4                   | "Wrong Number"    |

### Frontend → Database

| Frontend (String)   | Database (SMALLINT) |
|---------------------|---------------------|
| "Busy"              | 1                   |
| "RNR"                | 2                   |
| "Connected"          | 3                   |
| "Wrong Number"       | 4                   |

## Error Handling

All errors return standard format:

```json
{
  "error": "Human readable message"
}
```

**Common Errors:**

- `400 Bad Request` - Duplicate application, validation error
- `404 Not Found` - Application/candidate/job role not found
- `403 Forbidden` - Not a recruiter or inactive account
- `401 Unauthorized` - Invalid or missing JWT token

## Security Notes

1. **Role Isolation:** Recruiters can only access their own applications
2. **No Cross-Schema Access:** Module only queries `sourcing` schema
3. **Duplicate Prevention:** Applications checked before insert
4. **Parameter Binding:** All queries use parameterized statements

## Performance Notes

1. **Partition Pruning:** Date filters automatically use partitions
2. **Materialized Views:** Dashboard uses `mv_recruiter_daily_stats`
3. **Index Usage:** Queries optimized for existing indexes
4. **Pagination:** All list endpoints support pagination

## Future Sub-Service Extraction

Module is designed for future extraction:

1. Copy `src/modules/recruiter/` to new service
2. Update database connection to point to recruiter DB
3. Update environment variables
4. Deploy independently

No code changes needed - module is self-contained.
