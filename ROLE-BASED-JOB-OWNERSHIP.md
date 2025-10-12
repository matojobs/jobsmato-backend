# Role-Based Job Ownership Implementation

## 🎯 **Overview**

This document describes the implementation of role-based job ownership and visibility in the Jobsmato backend API. The system ensures that employers can only see and edit their own job posts, while candidates can view all active jobs for job searching.

## 📋 **Requirements**

### **Business Rules:**
1. **Employers**: Can only see, edit, and delete their own job posts
2. **Candidates**: Can see all active job posts (for job searching)
3. **Admins**: Can see all job posts (for management)
4. **Job Creation**: Only employers can create jobs
5. **Job Editing**: Only the job owner can edit their jobs

### **API Behavior:**
- `GET /api/jobs` - Role-based job listing
- `GET /api/jobs/my-jobs` - Employer's own jobs only
- `PUT /api/jobs/:id` - Only job owner can edit
- `DELETE /api/jobs/:id` - Only job owner can delete

## 🔧 **Implementation Details**

### **1. Database Schema**

The existing database schema already supports job ownership through the `companyId` field in the `jobs` table:

```sql
-- Jobs table structure
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  -- ... other fields
  companyId INTEGER NOT NULL,
  FOREIGN KEY (companyId) REFERENCES companies(id)
);

-- Companies table structure  
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  userId INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### **2. Service Layer Changes**

#### **Updated `JobsService.findAll()` Method:**

```typescript
async findAll(searchDto: JobSearchDto, user?: User): Promise<{
  jobs: JobResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const queryBuilder = this.jobRepository
    .createQueryBuilder('job')
    .leftJoinAndSelect('job.company', 'company')
    .where('job.status = :status', { status: JobStatus.ACTIVE });

  // Role-based filtering
  if (user) {
    if (user.role === UserRole.EMPLOYER) {
      // Employers can only see their own jobs
      queryBuilder.andWhere('company.userId = :userId', { userId: user.id });
    }
    // Candidates and Admins can see all jobs (no additional filtering)
  }

  // ... rest of the filtering logic
}
```

#### **New `JobsService.getMyJobs()` Method:**

```typescript
async getMyJobs(userId: number, searchDto?: JobSearchDto): Promise<{
  jobs: JobResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // Get user's company
  const company = await this.companyRepository.findOne({
    where: { userId },
  });

  if (!company) {
    return { jobs: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }

  // Filter jobs by company ID
  const queryBuilder = this.jobRepository
    .createQueryBuilder('job')
    .leftJoinAndSelect('job.company', 'company')
    .where('job.companyId = :companyId', { companyId: company.id });

  // ... apply search filters and pagination
}
```

### **3. Controller Layer Changes**

#### **Updated Job Listing Endpoint:**

```typescript
@Get()
@ApiOperation({ summary: 'Search and filter jobs (role-based visibility)' })
async findAll(@Query() searchDto: JobSearchDto, @CurrentUser() user?: User) {
  return this.jobsService.findAll(searchDto, user);
}
```

#### **New Employer Jobs Endpoint:**

```typescript
@Get('my-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYER)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get employer\'s own jobs' })
async getMyJobs(@Query() searchDto: JobSearchDto, @CurrentUser() user: User) {
  return this.jobsService.getMyJobs(user.id, searchDto);
}
```

### **4. Ownership Validation**

The existing `update` and `remove` methods already include ownership validation:

```typescript
async update(id: number, updateJobDto: UpdateJobDto, userId: number): Promise<JobResponseDto> {
  const job = await this.jobRepository.findOne({
    where: { id },
    relations: ['company'],
  });

  if (!job) {
    throw new NotFoundException('Job not found');
  }

  // Check if user owns this job
  if (job.company.userId !== userId) {
    throw new ForbiddenException('You can only update your own jobs');
  }

  // ... update logic
}
```

## 🌐 **API Endpoints**

### **Public Endpoints (No Authentication Required)**

#### **Get All Jobs (Role-Based)**
```http
GET /api/jobs
```

**Behavior:**
- **Unauthenticated**: Returns all active jobs (for public job search)
- **Candidates**: Returns all active jobs
- **Employers**: Returns only their own jobs
- **Admins**: Returns all jobs

**Query Parameters:**
- `search` - Search in title, description, company name
- `location` - Filter by location
- `type` - Filter by job type
- `category` - Filter by category
- `industry` - Filter by industry
- `experienceLevel` - Filter by experience level
- `isRemote` - Filter by remote work
- `isFeatured` - Filter by featured jobs
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### **Authenticated Endpoints**

#### **Get My Jobs (Employers Only)**
```http
GET /api/jobs/my-jobs
Authorization: Bearer <token>
```

**Behavior:**
- Returns only the authenticated employer's jobs
- Includes all job statuses (active, draft, paused, closed)
- Supports all search and filter parameters

#### **Create Job (Employers Only)**
```http
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Software Engineer",
  "description": "We are looking for...",
  "requirements": "Bachelor's degree...",
  "location": "San Francisco, CA",
  "type": "full_time",
  "category": "Technology",
  "industry": "Technology",
  "salary": "$80,000 - $120,000",
  "experienceLevel": "mid_level"
}
```

#### **Update Job (Job Owner Only)**
```http
PUT /api/jobs/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Job Title",
  "description": "Updated description..."
}
```

#### **Delete Job (Job Owner Only)**
```http
DELETE /api/jobs/:id
Authorization: Bearer <token>
```

## 🔐 **Security Implementation**

### **Role-Based Access Control**

| User Role | Job Visibility | Job Creation | Job Editing | Job Deletion |
|-----------|---------------|--------------|-------------|--------------|
| **Unauthenticated** | All active jobs | ❌ | ❌ | ❌ |
| **Candidates** | All active jobs | ❌ | ❌ | ❌ |
| **Employers** | Own jobs only | ✅ | Own jobs only | Own jobs only |
| **Admins** | All jobs | ✅ | All jobs | All jobs |

### **Ownership Validation**

```typescript
// Check if user owns the job
if (job.company.userId !== userId) {
  throw new ForbiddenException('You can only update your own jobs');
}
```

### **Guards and Decorators**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYER)
@ApiBearerAuth()
```

## 📱 **Frontend Integration**

### **For Job Seekers (Candidates)**

```javascript
// Get all jobs for job searching
const response = await fetch('https://api.jobsmato.com/api/jobs', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${candidateToken}`,
    'Content-Type': 'application/json'
  }
});

const { jobs, total, page, limit, totalPages } = await response.json();
```

### **For Employers**

```javascript
// Get all jobs (will show only employer's own jobs)
const allJobsResponse = await fetch('https://api.jobsmato.com/api/jobs', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${employerToken}`,
    'Content-Type': 'application/json'
  }
});

// Get specifically employer's own jobs
const myJobsResponse = await fetch('https://api.jobsmato.com/api/jobs/my-jobs', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${employerToken}`,
    'Content-Type': 'application/json'
  }
});

// Create a new job
const createJobResponse = await fetch('https://api.jobsmato.com/api/jobs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${employerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Job Position',
    description: 'Job description...',
    requirements: 'Requirements...',
    location: 'New York, NY',
    type: 'full_time',
    category: 'Technology',
    industry: 'Technology',
    salary: '$70,000 - $100,000',
    experienceLevel: 'mid_level'
  })
});

// Update own job
const updateJobResponse = await fetch('https://api.jobsmato.com/api/jobs/123', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${employerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Updated Job Title',
    description: 'Updated description...'
  })
});
```

## 🧪 **Testing Scenarios**

### **Test Cases**

#### **1. Employer Job Visibility**
```bash
# Login as employer
curl -X POST https://api.jobsmato.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employer@example.com","password":"password"}'

# Get jobs (should show only employer's jobs)
curl -X GET https://api.jobsmato.com/api/jobs \
  -H "Authorization: Bearer <employer_token>"

# Get my jobs specifically
curl -X GET https://api.jobsmato.com/api/jobs/my-jobs \
  -H "Authorization: Bearer <employer_token>"
```

#### **2. Candidate Job Visibility**
```bash
# Login as candidate
curl -X POST https://api.jobsmato.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidate@example.com","password":"password"}'

# Get jobs (should show all active jobs)
curl -X GET https://api.jobsmato.com/api/jobs \
  -H "Authorization: Bearer <candidate_token>"
```

#### **3. Ownership Validation**
```bash
# Try to update another employer's job (should fail)
curl -X PUT https://api.jobsmato.com/api/jobs/123 \
  -H "Authorization: Bearer <different_employer_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Unauthorized Update"}'

# Expected response: 403 Forbidden
```

## 📊 **Response Examples**

### **Job Listing Response**

```json
{
  "jobs": [
    {
      "id": 1,
      "title": "Software Engineer",
      "description": "We are looking for a software engineer...",
      "requirements": "Bachelor's degree in Computer Science...",
      "location": "San Francisco, CA",
      "type": "full_time",
      "category": "Technology",
      "industry": "Technology",
      "salary": "$80,000 - $120,000",
      "experienceLevel": "mid_level",
      "isRemote": true,
      "isUrgent": false,
      "isFeatured": true,
      "status": "active",
      "views": 150,
      "applicationsCount": 25,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "company": {
        "id": 1,
        "name": "Tech Company Inc",
        "logo": "https://example.com/logo.png",
        "location": "San Francisco, CA"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### **Error Responses**

#### **403 Forbidden (Not Job Owner)**
```json
{
  "message": "You can only update your own jobs",
  "error": "Forbidden",
  "statusCode": 403
}
```

#### **404 Not Found (Job Doesn't Exist)**
```json
{
  "message": "Job not found",
  "error": "Not Found",
  "statusCode": 404
}
```

## 🚀 **Deployment**

### **Files Modified**
- `src/modules/jobs/jobs.service.ts` - Added role-based filtering
- `src/modules/jobs/jobs.controller.ts` - Added new endpoints
- `ROLE-BASED-JOB-OWNERSHIP.md` - This documentation

### **Database Changes**
- No database schema changes required
- Existing `companyId` field in `jobs` table is used for ownership

### **Backward Compatibility**
- Existing API endpoints remain unchanged
- New role-based behavior is additive
- Public job search still works without authentication

## ✅ **Benefits**

### **Security**
- Employers can only manage their own jobs
- Prevents unauthorized job modifications
- Role-based access control

### **User Experience**
- Employers see only relevant jobs in their dashboard
- Candidates can search all available jobs
- Clear separation of concerns

### **Scalability**
- Efficient database queries with proper filtering
- Reduced data transfer for employers
- Better performance for large job databases

## 🔄 **Future Enhancements**

### **Potential Improvements**
1. **Job Analytics**: Track job performance for employers
2. **Bulk Operations**: Allow employers to manage multiple jobs
3. **Job Templates**: Save job templates for quick posting
4. **Advanced Filtering**: More sophisticated search options
5. **Job Recommendations**: Suggest similar jobs to candidates

### **Monitoring**
- Track job creation and modification rates
- Monitor API usage by role
- Analyze job search patterns

---

**This implementation ensures secure, role-based job ownership while maintaining a great user experience for both employers and job seekers.** 🎉
