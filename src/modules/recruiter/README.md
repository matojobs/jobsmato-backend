# Recruiter Module

A fully isolated NestJS module for managing recruiter operations in the sourcing DataLake system.

## Architecture

```
src/modules/recruiter/
├── recruiter.controller.ts    # All API endpoints
├── recruiter.service.ts       # Business logic & data access
├── recruiter.module.ts        # Module definition
├── guards/
│   └── recruiter.guard.ts    # Role-based access control
├── dto/
│   ├── create-application.dto.ts
│   ├── update-application.dto.ts
│   ├── create-candidate.dto.ts
│   ├── create-job-role.dto.ts
│   └── query-params.dto.ts
├── enums/
│   └── status.enum.ts         # Status enums & string constants
├── mappers/
│   └── status.mapper.ts       # SMALLINT ↔ string conversion
├── interfaces/
│   ├── application-response.interface.ts
│   └── dashboard.interface.ts
└── index.ts                   # Module exports
```

## Features

### ✅ Complete Isolation
- Only accesses `sourcing` schema
- No interference with job portal users
- Separate role guard (`RECRUITER`)
- Cannot access admin or ETL APIs

### ✅ Exact Payload Contract
- All field names match frontend spec **EXACTLY** (snake_case)
- No camelCase transformation
- No field renaming
- Response structure matches frontend expectations

### ✅ Status Mapping
- Database: SMALLINT (1-4)
- Frontend: String values ("Busy", "RNR", "Connected", etc.)
- Automatic conversion in service layer
- Never exposes integers to frontend

### ✅ Full CRUD Operations
- Create, Read, Update, Delete applications
- Duplicate prevention (candidate_id + job_role_id + assigned_date)
- Recruiter isolation (can only access own applications)
- Partition-aware inserts

### ✅ Query Optimization
- Uses partition pruning
- Leverages materialized views for dashboard
- Index-optimized queries
- Efficient pagination

## API Endpoints

### Master Data

```
GET    /api/recruiters              # List all recruiters
GET    /api/companies               # List all companies
GET    /api/job-roles               # List job roles (optional ?company_id filter)
POST   /api/job-roles               # Create job role
GET    /api/candidates              # List candidates (optional ?search filter)
POST   /api/candidates              # Create candidate
```

### Applications (CRUD)

```
GET    /api/applications            # List applications (with filters & pagination)
GET    /api/applications/:id        # Get single application
POST   /api/applications            # Create application
PATCH  /api/applications/:id        # Update application
DELETE /api/applications/:id        # Delete application
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `recruiter_id`, `job_role_id`, `company_id` - Filters
- `call_status`, `interested_status`, `selection_status`, `joining_status` - Status filters
- `start_date`, `end_date` - Date range

### Dashboard

```
GET    /api/dashboard/stats                    # Overall statistics
GET    /api/dashboard/pipeline                 # Pipeline breakdown
GET    /api/reports/recruiter-performance      # Performance report (optional ?start_date, ?end_date)
```

## Status Values

### Call Status
- `"Busy"` → 1
- `"RNR"` → 2
- `"Connected"` → 3
- `"Wrong Number"` → 4

### Interested Status
- `"Yes"` → 1
- `"No"` → 2
- `"Call Back Later"` → 3

### Selection Status
- `"Selected"` → 1
- `"Not Selected"` → 2
- `"Pending"` → 3

### Joining Status
- `"Joined"` → 1
- `"Not Joined"` → 2
- `"Pending"` → 3
- `"Backed Out"` → 4

## Security

### Role Guard
All endpoints protected by:
```typescript
@UseGuards(JwtAuthGuard, RecruiterGuard)
```

- Requires valid JWT token
- Requires `UserRole.RECRUITER`
- User must be active
- Prevents access to other modules

### Data Isolation
- Recruiters can only see/modify their own applications
- Queries automatically filter by `recruiter_id`
- Prevents cross-recruiter data access

### Duplicate Prevention
- Applications checked for duplicates on create
- Unique constraint: `(candidate_id, job_role_id, assigned_date)`
- Returns 400 if duplicate detected

## Usage Example

```typescript
// Create application
POST /api/applications
{
  "candidate_id": 1,
  "job_role_id": 5,
  "assigned_date": "2026-02-05",
  "call_date": "2026-02-05",
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Selected",
  "joining_status": "Pending",
  "notes": "Candidate showed strong interest"
}

// Response (exact field names)
{
  "id": 123,
  "candidate_id": 1,
  "recruiter_id": 2,
  "job_role_id": 5,
  "assigned_date": "2026-02-05",
  "call_date": "2026-02-05",
  "call_status": "Connected",        // String, not integer
  "interested_status": "Yes",        // String, not integer
  "selection_status": "Selected",     // String, not integer
  "joining_status": "Pending",       // String, not integer
  "notes": "Candidate showed strong interest",
  "created_at": "2026-02-05T10:00:00Z",
  "updated_at": "2026-02-05T10:00:00Z",
  "candidate": { ... },
  "recruiter": { ... },
  "job_role": { ... },
  "company": { ... }
}
```

## Error Responses

All errors follow standard format:

```json
{
  "error": "Human readable message"
}
```

**Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error or duplicate
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Sub-Service Ready

Module designed for future extraction to `recruiter-service.yourdomain.com`:

- ✅ No tight coupling to other modules
- ✅ Separate environment config support
- ✅ No cross-schema writes
- ✅ Self-contained business logic
- ✅ Independent database access

## Environment Configuration

Add to `.env`:

```env
# Recruiter Module (future sub-service)
RECRUITER_SERVICE_ENABLED=true
RECRUITER_DB_SCHEMA=sourcing
```

## Testing

```bash
# Run tests
npm test -- recruiter

# Test specific endpoint
curl -X GET http://localhost:5000/api/applications \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

## Migration Notes

1. Ensure `UserRole.RECRUITER` exists in `user.entity.ts` ✅
2. Ensure `sourcing` schema exists ✅
3. Ensure recruiter records exist with matching email to user accounts
4. Run migrations: `npm run migration:run`

## Performance Considerations

- Dashboard queries use materialized views
- Partition pruning for date-based queries
- Index-optimized lookups
- Efficient pagination (LIMIT/OFFSET)
- Connection pooling via TypeORM

## Future Enhancements

- [ ] Add caching layer for recruiter ID lookup
- [ ] Add bulk operations endpoint
- [ ] Add export functionality
- [ ] Add advanced filtering
- [ ] Add audit logging
- [ ] Add rate limiting per recruiter
