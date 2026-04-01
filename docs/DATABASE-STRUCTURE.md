# Database Structure Documentation

Complete database schema documentation for the Jobsmato backend (PostgreSQL).

**Database:** `jobsmato_db`  
**ORM:** TypeORM  
**Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Job-Related Tables](#job-related-tables)
5. [User Activity Tables](#user-activity-tables)
6. [Content Tables](#content-tables)
7. [Admin & System Tables](#admin--system-tables)
8. [Enums](#enums)
9. [Indexes Summary](#indexes-summary)
10. [Foreign Keys & Relationships](#foreign-keys--relationships)

---

## Overview

The database consists of **18 tables** organized into:

- **Core:** Users, Companies, Jobs
- **Job Management:** Applications, Saved Jobs, Job Alerts, Job Views, Job Statistics
- **User Activity:** Notifications, Company Reviews
- **Content:** Blog Posts, Blog Comments, Contact Messages
- **Admin:** Admin Action Logs, Bulk Uploads, Error Logs, System Settings
- **Auth:** Password Reset Tokens

**Key Design Decisions:**

- **Users** table is polymorphic: supports `job_seeker`, `employer`, and `admin` roles
- **Companies** have a one-to-one relationship with Users (employer)
- **Jobs** belong to Companies (many-to-one)
- **Job Applications** link Users (job seekers) to Jobs
- **Candidate contact fields** stored per application (candidateName, candidateEmail, candidatePhone)
- **Experience levels** stored as integers (0-4) instead of strings
- **JSONB** used for flexible data (languages, metadata, error logs)
- **Admin review workflow** for Jobs and Companies (pending/approved/rejected/suspended)

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│    Users    │◄────────┤  Companies  │ (One-to-One)
│             │         │             │
└──────┬──────┘         └──────┬──────┘
       │                        │
       │                        │
       │                        │
       │                        ▼
       │                  ┌──────────────┐
       │                  │    Jobs      │
       │                  │              │
       │                  └──────┬───────┘
       │                         │
       │                         │
       ▼                         │
┌─────────────────┐              │
│ Job Applications│◄─────────────┘
│                 │
└─────────────────┘

Users ──┬──► Saved Jobs ──► Jobs
       ├──► Job Alerts
       ├──► Notifications
       ├──► Company Reviews ──► Companies
       ├──► Blog Posts ──► Blog Comments
       ├──► Admin Actions Log
       └──► Bulk Uploads

Jobs ──┬──► Job Views
       ├──► Job Statistics
       └──► Job Alerts

Companies ──► Company Reviews
```

---

## Core Tables

### `users`

**Description:** Central user table supporting job seekers, employers, and admins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `email` | `VARCHAR` | UNIQUE, NOT NULL, INDEXED | User email address |
| `password` | `VARCHAR` | NULLABLE | Hashed password (nullable for OAuth users) |
| `googleId` | `VARCHAR` | UNIQUE, NULLABLE, INDEXED | Google OAuth ID |
| `firstName` | `VARCHAR` | NOT NULL | First name |
| `lastName` | `VARCHAR` | NULLABLE | Last name (nullable for OAuth users) |
| `role` | `ENUM` | NOT NULL, DEFAULT `job_seeker` | `job_seeker`, `employer`, `admin` |
| `status` | `ENUM` | NOT NULL, DEFAULT `active` | `active`, `inactive`, `suspended`, `pending_verification` |
| `avatar` | `VARCHAR` | NULLABLE | Avatar URL |
| `phone` | `VARCHAR` | NULLABLE | Phone number |
| `location` | `VARCHAR` | NULLABLE | Location |
| `dateOfBirth` | `DATE` | NULLABLE | Date of birth |
| `gender` | `ENUM` | NULLABLE | `male`, `female`, `other` |
| `bio` | `TEXT` | NULLABLE | Bio/description |
| `linkedin` | `VARCHAR` | NULLABLE | LinkedIn URL |
| `github` | `VARCHAR` | NULLABLE | GitHub URL |
| `website` | `VARCHAR` | NULLABLE | Website URL |
| `resume` | `VARCHAR` | NULLABLE | Resume file URL/path |
| `coverLetter` | `TEXT` | NULLABLE | Cover letter |
| `skills` | `TEXT[]` | DEFAULT `[]` | Array of skills |
| `technicalSkills` | `TEXT[]` | DEFAULT `[]` | Technical skills array |
| `functionalSkills` | `TEXT[]` | DEFAULT `[]` | Functional skills array |
| `currentCompany` | `VARCHAR` | NULLABLE | Current company name |
| `currentJobTitle` | `VARCHAR` | NULLABLE | Current job title |
| `currentCTC` | `VARCHAR` | NULLABLE | Current CTC |
| `experience` | `TEXT` | NULLABLE | Experience description |
| `education` | `TEXT` | NULLABLE | Education details |
| `specialization` | `VARCHAR` | NULLABLE | Specialization |
| `university` | `VARCHAR` | NULLABLE | University name |
| `yearOfPassing` | `VARCHAR` | NULLABLE | Year of passing |
| `certifications` | `TEXT[]` | DEFAULT `[]` | Certifications array |
| `portfolio` | `VARCHAR` | NULLABLE | Portfolio URL |
| `availability` | `VARCHAR` | NULLABLE | Availability status |
| `salaryExpectation` | `VARCHAR` | NULLABLE | Salary expectation |
| `preferredJobTypes` | `ENUM[]` | DEFAULT `[]` | Preferred job types array |
| `preferredLocations` | `TEXT[]` | NULLABLE, DEFAULT `[]` | Preferred locations array |
| `isOpenToWork` | `BOOLEAN` | DEFAULT `true` | Open to work flag |
| `experienceType` | `INTEGER` | NULLABLE | Experience level (0-4) |
| `languages` | `JSONB` | NULLABLE, DEFAULT `[]` | Languages with proficiency |
| `industry` | `ENUM` | NULLABLE, INDEXED | Industry enum |
| `hasBike` | `BOOLEAN` | DEFAULT `false` | Has bike |
| `hasDrivingLicense` | `BOOLEAN` | DEFAULT `false` | Has driving license |
| `emailVerified` | `BOOLEAN` | DEFAULT `false` | Email verified |
| `onboardingComplete` | `BOOLEAN` | DEFAULT `false` | Onboarding completed |
| `lastLoginAt` | `TIMESTAMP` | NULLABLE | Last login timestamp |
| `loginCount` | `INTEGER` | DEFAULT `0` | Login count |
| `isActive` | `BOOLEAN` | DEFAULT `true` | Active status |
| `isVerified` | `BOOLEAN` | DEFAULT `false` | Verified status |
| `verificationToken` | `VARCHAR` | NULLABLE | Email verification token |
| `verificationExpiresAt` | `TIMESTAMP` | NULLABLE | Token expiration |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |

**Relationships:**
- One-to-One: `Company` (via `userId`)
- One-to-Many: `JobApplication`, `SavedJob`, `JobAlert`, `Notification`, `BlogPost`, `CompanyReview`, `AdminActionLog`, `BulkUpload`
- Many-to-One: `Job` (adminReviewedJobs), `Company` (adminReviewedCompanies)

**Indexes:**
- `email` (unique)
- `googleId` (unique)
- `industry`

---

### `companies`

**Description:** Company profiles linked to employer users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `name` | `VARCHAR` | NOT NULL | Company name |
| `slug` | `VARCHAR` | UNIQUE, NOT NULL, INDEXED | URL-friendly slug |
| `description` | `TEXT` | NULLABLE | Company description |
| `website` | `VARCHAR` | NULLABLE | Website URL |
| `logo` | `VARCHAR` | NULLABLE | Logo URL |
| `industry` | `VARCHAR` | NULLABLE | Industry |
| `size` | `ENUM` | NULLABLE | `startup`, `small`, `medium`, `large`, `enterprise` |
| `location` | `VARCHAR` | NULLABLE | Location |
| `foundedYear` | `INTEGER` | NULLABLE | Founded year |
| `isVerified` | `BOOLEAN` | DEFAULT `false` | Verified status |
| `adminNotes` | `TEXT` | NULLABLE | Admin notes |
| `adminStatus` | `VARCHAR` | DEFAULT `pending` | `pending`, `approved`, `rejected`, `suspended` |
| `adminReviewedAt` | `TIMESTAMP` | NULLABLE | Admin review timestamp |
| `adminReviewedBy` | `INTEGER` | NULLABLE | Admin user ID (FK) |
| `adminVerified` | `BOOLEAN` | DEFAULT `false` | Admin verified flag |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `userId` | `INTEGER` | NOT NULL | User ID (FK to users) |

**Relationships:**
- One-to-One: `User` (via `userId`)
- One-to-Many: `Job`, `CompanyReview`
- Many-to-One: `User` (adminReviewer)

**Indexes:**
- `slug` (unique)

---

### `jobs`

**Description:** Job postings by companies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `title` | `VARCHAR` | NOT NULL | Job title |
| `slug` | `VARCHAR` | UNIQUE, NOT NULL, INDEXED | URL-friendly slug |
| `description` | `TEXT` | NOT NULL | Job description |
| `requirements` | `TEXT` | NOT NULL | Requirements |
| `benefits` | `TEXT` | NULLABLE | Benefits |
| `salary` | `VARCHAR` | NULLABLE | Salary range |
| `location` | `VARCHAR` | NOT NULL | Job location |
| `type` | `ENUM` | NOT NULL | `full_time`, `part_time`, `contract`, `intern`, `temporary` |
| `category` | `VARCHAR` | NOT NULL | Category |
| `industry` | `ENUM` | NULLABLE, INDEXED | Industry enum |
| `experience` | `INTEGER` | NULLABLE, INDEXED | Experience level (0-4) |
| `isRemote` | `BOOLEAN` | DEFAULT `false` | Remote job flag |
| `isUrgent` | `BOOLEAN` | DEFAULT `false` | Urgent flag |
| `isFeatured` | `BOOLEAN` | DEFAULT `false` | Featured flag |
| `status` | `ENUM` | DEFAULT `draft` | `draft`, `active`, `paused`, `closed` |
| `applicationDeadline` | `TIMESTAMP` | NULLABLE | Application deadline |
| `views` | `INTEGER` | DEFAULT `0` | View count |
| `applicationsCount` | `INTEGER` | DEFAULT `0` | Applications count |
| `adminNotes` | `TEXT` | NULLABLE | Admin notes |
| `adminStatus` | `VARCHAR` | DEFAULT `approved` | `pending`, `approved`, `rejected`, `suspended` |
| `adminReviewedAt` | `TIMESTAMP` | NULLABLE | Admin review timestamp |
| `adminReviewedBy` | `INTEGER` | NULLABLE | Admin user ID (FK) |
| `hrName` | `VARCHAR` | NULLABLE | HR/Recruiter name |
| `hrContact` | `VARCHAR` | NULLABLE | HR contact (phone/email) |
| `hrWhatsapp` | `VARCHAR` | NULLABLE | HR WhatsApp number |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `postedDate` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Posted date |
| `companyId` | `INTEGER` | NOT NULL | Company ID (FK) |

**Relationships:**
- Many-to-One: `Company` (via `companyId`), `User` (adminReviewer)
- One-to-Many: `JobApplication`, `SavedJob`, `JobAlert`

**Indexes:**
- `slug` (unique)
- `industry`
- `experience`

**Notes:**
- Maximum 10 active jobs per employer (enforced in application logic)
- `postedDate` used for sorting (falls back to `createdAt` if not set)

---

## Job-Related Tables

### `job_applications`

**Description:** Job applications by job seekers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `resume` | `VARCHAR` | NULLABLE | Resume filename/URL |
| `coverLetter` | `TEXT` | NULLABLE | Cover letter |
| `candidatename` | `VARCHAR` | NULLABLE | Candidate name (per application) |
| `candidateemail` | `VARCHAR` | NULLABLE | Candidate email (per application) |
| `candidatephone` | `VARCHAR` | NULLABLE | Candidate phone (per application) |
| `status` | `ENUM` | DEFAULT `pending` | `pending`, `reviewing`, `shortlisted`, `interview`, `rejected`, `accepted`, `withdrawn` |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `userId` | `INTEGER` | NOT NULL, INDEXED | User ID (FK to users) |
| `jobId` | `INTEGER` | NOT NULL, INDEXED | Job ID (FK to jobs) |

**Relationships:**
- Many-to-One: `User` (via `userId`), `Job` (via `jobId`)

**Indexes:**
- `userId`
- `jobId`

**Notes:**
- Column names are lowercase in DB (`candidatename`, `candidateemail`, `candidatephone`) due to migration
- Candidate contact fields allow applications without user accounts
- Duplicate prevention enforced in application logic (user + job)

---

### `saved_jobs`

**Description:** Jobs saved by users (bookmarks).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `userId` | `INTEGER` | NOT NULL, INDEXED | User ID (FK to users) |
| `jobId` | `INTEGER` | NOT NULL, INDEXED | Job ID (FK to jobs) |

**Relationships:**
- Many-to-One: `User` (via `userId`), `Job` (via `jobId`)

**Indexes:**
- `userId`
- `jobId`
- Unique constraint: `(userId, jobId)`

---

### `job_alerts`

**Description:** Job alert subscriptions by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `keyword` | `VARCHAR` | NOT NULL | Search keyword |
| `location` | `VARCHAR` | NULLABLE | Location filter |
| `category` | `VARCHAR` | NULLABLE | Category filter |
| `jobTypes` | `ENUM[]` | DEFAULT `[]` | Job types array |
| `experienceLevels` | `INTEGER[]` | DEFAULT `[]` | Experience levels array (0-4) |
| `minSalary` | `INTEGER` | NULLABLE | Minimum salary |
| `maxSalary` | `INTEGER` | NULLABLE | Maximum salary |
| `isRemote` | `BOOLEAN` | DEFAULT `true` | Remote filter |
| `frequency` | `ENUM` | DEFAULT `weekly` | `daily`, `weekly`, `monthly` |
| `isActive` | `BOOLEAN` | DEFAULT `true` | Active status |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `userId` | `INTEGER` | NOT NULL, INDEXED | User ID (FK to users) |
| `jobId` | `INTEGER` | NULLABLE | Job ID (FK to jobs, optional) |

**Relationships:**
- Many-to-One: `User` (via `userId`), `Job` (via `jobId`, optional)

**Indexes:**
- `userId`

---

### `job_views`

**Description:** Job view tracking (anonymous and authenticated).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `jobId` | `INTEGER` | NOT NULL, INDEXED | Job ID (FK to jobs) |
| `userId` | `INTEGER` | NULLABLE | User ID (FK to users, null for anonymous) |
| `ipAddress` | `VARCHAR(45)` | NOT NULL | IP address |
| `userAgent` | `TEXT` | NULLABLE | User agent string |
| `viewedAt` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP, INDEXED | View timestamp |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |

**Relationships:**
- Many-to-One: `Job` (via `jobId`), `User` (via `userId`, nullable)

**Indexes:**
- `jobId`
- `viewedAt`

---

### `job_statistics`

**Description:** Aggregated statistics per job.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `jobId` | `INTEGER` | UNIQUE, NOT NULL, INDEXED | Job ID (FK to jobs) |
| `totalViews` | `INTEGER` | DEFAULT `0` | Total views |
| `totalApplications` | `INTEGER` | DEFAULT `0` | Total applications |
| `uniqueViews` | `INTEGER` | DEFAULT `0` | Unique views |
| `lastViewedAt` | `TIMESTAMP` | NULLABLE | Last view timestamp |
| `lastApplicationAt` | `TIMESTAMP` | NULLABLE | Last application timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |

**Relationships:**
- One-to-One: `Job` (via `jobId`)

**Indexes:**
- `jobId` (unique)

---

## User Activity Tables

### `notifications`

**Description:** User notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `title` | `VARCHAR` | NOT NULL | Notification title |
| `message` | `TEXT` | NOT NULL | Notification message |
| `type` | `ENUM` | NOT NULL | `job_application`, `job_alert`, `application_status_update`, `new_job_match`, `company_message`, `system_announcement` |
| `isRead` | `BOOLEAN` | DEFAULT `false` | Read status |
| `actionUrl` | `VARCHAR` | NULLABLE | Action URL |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `userId` | `INTEGER` | NOT NULL, INDEXED | User ID (FK to users) |

**Relationships:**
- Many-to-One: `User` (via `userId`)

**Indexes:**
- `userId`

---

### `company_reviews`

**Description:** Company reviews by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `rating` | `DECIMAL(2,1)` | NOT NULL | Rating (0.0-5.0) |
| `review` | `TEXT` | NOT NULL | Review text |
| `pros` | `VARCHAR` | NULLABLE | Pros |
| `cons` | `VARCHAR` | NULLABLE | Cons |
| `jobTitle` | `VARCHAR` | NOT NULL | Job title |
| `employmentStartDate` | `DATE` | NOT NULL | Employment start date |
| `employmentEndDate` | `DATE` | NULLABLE | Employment end date |
| `isCurrentEmployee` | `BOOLEAN` | DEFAULT `false` | Current employee flag |
| `isApproved` | `BOOLEAN` | DEFAULT `false` | Approved status |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `userId` | `INTEGER` | NOT NULL, INDEXED | User ID (FK to users) |
| `companyId` | `INTEGER` | NOT NULL, INDEXED | Company ID (FK to companies) |

**Relationships:**
- Many-to-One: `User` (via `userId`), `Company` (via `companyId`)

**Indexes:**
- `userId`
- `companyId`

---

## Content Tables

### `blog_posts`

**Description:** Blog posts/articles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `title` | `VARCHAR` | NOT NULL | Post title |
| `slug` | `VARCHAR` | UNIQUE, NOT NULL, INDEXED | URL-friendly slug |
| `excerpt` | `TEXT` | NOT NULL | Excerpt |
| `content` | `TEXT` | NOT NULL | Full content |
| `category` | `VARCHAR` | NOT NULL | Category |
| `tags` | `TEXT[]` | DEFAULT `[]` | Tags array |
| `featuredImage` | `VARCHAR` | NULLABLE | Featured image URL |
| `views` | `INTEGER` | DEFAULT `0` | View count |
| `commentsCount` | `INTEGER` | DEFAULT `0` | Comments count |
| `readTime` | `INTEGER` | DEFAULT `0` | Read time (minutes) |
| `isPublished` | `BOOLEAN` | DEFAULT `false` | Published status |
| `isFeatured` | `BOOLEAN` | DEFAULT `false` | Featured flag |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `publishedAt` | `TIMESTAMP` | NULLABLE | Publication timestamp |
| `authorId` | `INTEGER` | NOT NULL | Author user ID (FK to users) |

**Relationships:**
- Many-to-One: `User` (via `authorId`)
- One-to-Many: `BlogComment`

**Indexes:**
- `slug` (unique)

---

### `blog_comments`

**Description:** Comments on blog posts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `content` | `TEXT` | NOT NULL | Comment content |
| `authorName` | `VARCHAR` | NOT NULL | Author name |
| `authorEmail` | `VARCHAR` | NOT NULL | Author email |
| `authorAvatar` | `VARCHAR` | NULLABLE | Author avatar URL |
| `isApproved` | `BOOLEAN` | DEFAULT `false` | Approved status |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `postId` | `INTEGER` | NOT NULL, INDEXED | Post ID (FK to blog_posts) |

**Relationships:**
- Many-to-One: `BlogPost` (via `postId`)

**Indexes:**
- `postId`

---

### `contact_messages`

**Description:** Contact form submissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `name` | `VARCHAR` | NOT NULL | Sender name |
| `email` | `VARCHAR` | NOT NULL, INDEXED | Sender email |
| `subject` | `VARCHAR` | NOT NULL | Subject |
| `message` | `TEXT` | NOT NULL | Message content |
| `inquiryType` | `ENUM` | DEFAULT `general` | `general`, `support`, `billing`, `partnership`, `feedback` |
| `status` | `ENUM` | DEFAULT `new` | `new`, `in_progress`, `resolved`, `closed` |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |

**Indexes:**
- `email`

---

## Admin & System Tables

### `admin_actions_log`

**Description:** Audit log of admin actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `adminId` | `INTEGER` | NOT NULL | Admin user ID (FK to users) |
| `actionType` | `VARCHAR(50)` | NOT NULL, INDEXED | `create`, `update`, `delete`, `approve`, `reject`, `suspend`, `activate` |
| `targetType` | `VARCHAR(50)` | NOT NULL | `user`, `job`, `company`, `application`, `system` |
| `targetId` | `INTEGER` | NULLABLE | Target entity ID |
| `description` | `TEXT` | NULLABLE | Action description |
| `metadata` | `JSONB` | NULLABLE | Additional metadata |
| `ipAddress` | `INET` | NULLABLE | IP address |
| `userAgent` | `TEXT` | NULLABLE | User agent |
| `createdAt` | `TIMESTAMP` | NOT NULL, INDEXED | Creation timestamp |

**Relationships:**
- Many-to-One: `User` (via `adminId`)

**Indexes:**
- `actionType`
- `createdAt`

---

### `bulk_uploads`

**Description:** Bulk upload job tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `adminId` | `INTEGER` | NOT NULL | Admin user ID (FK to users) |
| `filename` | `VARCHAR(255)` | NOT NULL | Filename |
| `fileSize` | `INTEGER` | NULLABLE | File size (bytes) |
| `totalRecords` | `INTEGER` | NULLABLE | Total records |
| `successfulRecords` | `INTEGER` | NULLABLE | Successful records |
| `failedRecords` | `INTEGER` | NULLABLE | Failed records |
| `status` | `VARCHAR(20)` | DEFAULT `processing`, INDEXED | `processing`, `completed`, `failed`, `cancelled` |
| `errorLog` | `JSONB` | NULLABLE | Error log |
| `createdAt` | `TIMESTAMP` | NOT NULL, INDEXED | Creation timestamp |
| `completedAt` | `TIMESTAMP` | NULLABLE | Completion timestamp |

**Relationships:**
- Many-to-One: `User` (via `adminId`)

**Indexes:**
- `status`
- `createdAt`

---

### `error_logs`

**Description:** Application error logs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `errorType` | `VARCHAR(100)` | NOT NULL, INDEXED | Error type |
| `message` | `TEXT` | NOT NULL | Error message |
| `stack` | `TEXT` | NULLABLE | Stack trace |
| `method` | `VARCHAR(10)` | NOT NULL | HTTP method |
| `url` | `TEXT` | NOT NULL, INDEXED | Request URL |
| `statusCode` | `INTEGER` | NOT NULL, INDEXED | HTTP status code |
| `userId` | `INTEGER` | NULLABLE, INDEXED | User ID (FK to users) |
| `userEmail` | `VARCHAR` | NULLABLE | User email |
| `userRole` | `VARCHAR` | NULLABLE | User role |
| `ipAddress` | `VARCHAR` | NULLABLE | IP address |
| `userAgent` | `TEXT` | NULLABLE | User agent |
| `requestData` | `JSONB` | NULLABLE | Request data |
| `context` | `VARCHAR(100)` | NULLABLE | Context/service name |
| `createdAt` | `TIMESTAMP` | NOT NULL, INDEXED | Creation timestamp |

**Relationships:**
- Many-to-One: `User` (via `userId`, nullable)

**Indexes:**
- `errorType`
- `url`
- `statusCode`
- `userId`
- `createdAt`

---

### `system_settings`

**Description:** System configuration settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `settingKey` | `VARCHAR(100)` | UNIQUE, NOT NULL, INDEXED | Setting key |
| `settingValue` | `TEXT` | NULLABLE | Setting value (stored as text) |
| `settingType` | `VARCHAR(20)` | DEFAULT `string` | `string`, `number`, `boolean`, `json` |
| `description` | `TEXT` | NULLABLE | Description |
| `isPublic` | `BOOLEAN` | DEFAULT `false`, INDEXED | Public setting flag |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |

**Indexes:**
- `settingKey` (unique)
- `isPublic`

**Notes:**
- Values stored as text; helper methods convert based on `settingType`
- `isPublic` determines if setting is exposed to frontend

---

### `password_reset_tokens`

**Description:** Password reset tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | PRIMARY KEY | Auto-increment ID |
| `token` | `VARCHAR` | UNIQUE, NOT NULL, INDEXED | Reset token |
| `user_id` | `INTEGER` | NOT NULL | User ID (FK to users) |
| `expires_at` | `TIMESTAMP` | NOT NULL, INDEXED | Expiration timestamp |
| `used` | `BOOLEAN` | DEFAULT `false` | Used flag |
| `created_at` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updated_at` | `TIMESTAMP` | NOT NULL | Update timestamp |

**Relationships:**
- Many-to-One: `User` (via `user_id`, CASCADE DELETE)

**Indexes:**
- `token` (unique)
- `expires_at`

**Notes:**
- Column names use snake_case (migration convention)
- Tokens expire after set duration
- Tokens marked as used after password reset

---

## Enums

### UserRole
- `job_seeker`
- `employer`
- `admin`

### UserStatus
- `active`
- `inactive`
- `suspended`
- `pending_verification`

### Gender
- `male`
- `female`
- `other`

### JobType
- `full_time`
- `part_time`
- `contract`
- `intern`
- `temporary`

### JobStatus
- `draft`
- `active`
- `paused`
- `closed`

### Experience (numeric)
- `0` = Entry level (0-1 years)
- `1` = Junior level (1-3 years)
- `2` = Mid level (3-5 years)
- `3` = Senior level (5-8 years)
- `4` = Executive level (8+ years)

### Industry
See `job.entity.ts` for full list (25+ industries including IT, Healthcare, Finance, etc.)

### ApplicationStatus
- `pending`
- `reviewing`
- `shortlisted`
- `interview`
- `rejected`
- `accepted`
- `withdrawn`

### CompanySize
- `startup`
- `small`
- `medium`
- `large`
- `enterprise`

### NotificationType
- `job_application`
- `job_alert`
- `application_status_update`
- `new_job_match`
- `company_message`
- `system_announcement`

### AlertFrequency
- `daily`
- `weekly`
- `monthly`

### InquiryType
- `general`
- `support`
- `billing`
- `partnership`
- `feedback`

### MessageStatus
- `new`
- `in_progress`
- `resolved`
- `closed`

### BulkUploadStatus
- `processing`
- `completed`
- `failed`
- `cancelled`

### SettingType
- `string`
- `number`
- `boolean`
- `json`

---

## Indexes Summary

**Unique Indexes:**
- `users.email`
- `users.googleId`
- `companies.slug`
- `jobs.slug`
- `blog_posts.slug`
- `system_settings.settingKey`
- `password_reset_tokens.token`
- `job_statistics.jobId`

**Foreign Key Indexes:**
- `users.industry`
- `job_applications.userId`, `job_applications.jobId`
- `saved_jobs.userId`, `saved_jobs.jobId` (plus unique constraint)
- `job_alerts.userId`
- `job_views.jobId`, `job_views.viewedAt`
- `notifications.userId`
- `company_reviews.userId`, `company_reviews.companyId`
- `blog_comments.postId`

**Performance Indexes:**
- `admin_actions_log.actionType`, `admin_actions_log.createdAt`
- `bulk_uploads.status`, `bulk_uploads.createdAt`
- `error_logs.errorType`, `error_logs.url`, `error_logs.statusCode`, `error_logs.userId`, `error_logs.createdAt`
- `password_reset_tokens.expires_at`

---

## Foreign Keys & Relationships

### One-to-One
- `users` ↔ `companies` (via `companies.userId`)
- `jobs` ↔ `job_statistics` (via `job_statistics.jobId`)

### One-to-Many
- `users` → `job_applications` (via `job_applications.userId`)
- `users` → `saved_jobs` (via `saved_jobs.userId`)
- `users` → `job_alerts` (via `job_alerts.userId`)
- `users` → `notifications` (via `notifications.userId`)
- `users` → `blog_posts` (via `blog_posts.authorId`)
- `users` → `company_reviews` (via `company_reviews.userId`)
- `users` → `admin_actions_log` (via `admin_actions_log.adminId`)
- `users` → `bulk_uploads` (via `bulk_uploads.adminId`)
- `companies` → `jobs` (via `jobs.companyId`)
- `companies` → `company_reviews` (via `company_reviews.companyId`)
- `jobs` → `job_applications` (via `job_applications.jobId`)
- `jobs` → `saved_jobs` (via `saved_jobs.jobId`)
- `jobs` → `job_alerts` (via `job_alerts.jobId`)
- `jobs` → `job_views` (via `job_views.jobId`)
- `blog_posts` → `blog_comments` (via `blog_comments.postId`)

### Many-to-One (Admin Review)
- `jobs` → `users` (via `jobs.adminReviewedBy`)
- `companies` → `users` (via `companies.adminReviewedBy`)

---

## Notes

1. **Column Naming:** Some columns use lowercase (e.g., `candidatename`, `candidateemail`) due to migration history. TypeORM maps camelCase entities to these columns.

2. **Experience Levels:** Stored as integers (0-4) for easier querying and sorting.

3. **JSONB Fields:** Used for flexible data (languages, metadata, error logs, request data).

4. **Admin Workflow:** Jobs and Companies have `adminStatus` and `adminReviewedBy` for approval workflow.

5. **Soft Deletes:** Not implemented; use `status` fields or `isActive` flags.

6. **Timestamps:** All tables have `createdAt` and `updatedAt` (except `password_reset_tokens` uses snake_case).

7. **Cascade Deletes:** Only `password_reset_tokens` cascades on user delete.

8. **Unique Constraints:** `saved_jobs` has unique constraint on `(userId, jobId)` to prevent duplicates.

---

**Last Updated:** February 2026  
**Version:** 1.0.0
