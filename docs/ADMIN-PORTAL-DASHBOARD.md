# Admin Portal — Dashboard & Analytics APIs

This document describes how the **Admin Dashboard** should get its data from the backend using the admin dashboard and analytics endpoints.

---

## 1. Overview

- **Purpose:** Give admins a high-level view of users, jobs, companies, and job applications, plus simple analytics.
- **Base path:** All endpoints are under **`/api/admin/dashboard`**.
- **Auth:** Admin JWT required (`Authorization: Bearer <token>`).
- **Permissions:** The backend checks **`view_analytics`** for all endpoints in this document.

---

## 2. Dashboard stats (top cards)

### 2.1 Endpoint

```http
GET /api/admin/dashboard/stats
Authorization: Bearer <token>
```

### 2.2 Response shape

```json
{
  "totalUsers": 1200,
  "totalJobs": 150,
  "totalCompanies": 80,
  "totalApplications": 3500,
  "activeJobs": 95,
  "pendingApplications": 120,
  "newUsersToday": 15,
  "newJobsToday": 4,
  "userGrowthRate": 12.5,
  "jobPostingRate": 8.3,
  "applicationRate": 23.3
}
```

Suggested mapping to UI cards:

- **Total Users** → `totalUsers`
- **Total Companies** → `totalCompanies`
- **Total Jobs** → `totalJobs`
- **Active Jobs** → `activeJobs`
- **Total Applications** → `totalApplications`
- **Pending Applications** → `pendingApplications`
- **New Users Today** → `newUsersToday`
- **New Jobs Today** → `newJobsToday`
- **User Growth Rate** (e.g. “+12.5% vs last week”) → `userGrowthRate`
- **Job Posting Rate** → `jobPostingRate`
- **Applications per Job** (avg) → `applicationRate`

> All numbers are pre-computed on the backend; frontend should only display them.

---

## 3. User analytics

### 3.1 Endpoint

```http
GET /api/admin/dashboard/analytics/users?days=30
Authorization: Bearer <token>
```

- **Query param `days`** (optional, default: 30) controls the lookback period.

### 3.2 Response (simplified)

```json
{
  "userGrowth": [
    { "date": "2026-02-01", "value": 10 },
    { "date": "2026-02-02", "value": 15 }
  ],
  "userEngagement": [
    { "metric": "Active Users", "value": 150, "change": 12.5 },
    { "metric": "New Registrations", "value": 25, "change": 8.3 }
  ],
  "topUsers": [
    {
      "id": 31,
      "firstName": "a",
      "lastName": "a",
      "email": "a@a.com",
      "applicationCount": 12
    }
  ],
  "userRetention": []
}
```

Suggested usage:

- **User growth line chart** → `userGrowth` (x = `date`, y = `value`).
- **Engagement summary cards** → `userEngagement` array.
- **Top applicants table** → `topUsers`.

---

## 4. Job analytics

### 4.1 Endpoint

```http
GET /api/admin/dashboard/analytics/jobs?days=30
Authorization: Bearer <token>
```

### 4.2 Response (simplified)

```json
{
  "jobPostingTrends": [
    { "date": "2026-02-01", "value": 5 },
    { "date": "2026-02-02", "value": 8 }
  ],
  "categoryDistribution": [
    { "category": "IT", "count": 40 },
    { "category": "Sales", "count": 25 }
  ],
  "topCompanies": [
    { "id": 10, "name": "TechFlow Solutions", "jobCount": 12 }
  ],
  "jobPerformance": [
    {
      "jobId": 7,
      "title": "Telematics Application Engineer",
      "status": "active",
      "applicationCount": 34
    }
  ]
}
```

Suggested usage:

- **Job posting trends chart** → `jobPostingTrends` (line chart).
- **Job category distribution** → `categoryDistribution` (pie/donut/bar).
- **Top companies by jobs** → `topCompanies` table.
- **Top jobs by applications** → `jobPerformance` table.

---

## 5. Application analytics

### 5.1 Endpoint

```http
GET /api/admin/dashboard/analytics/applications?days=30
Authorization: Bearer <token>
```

### 5.2 Response (simplified)

```json
{
  "applicationRates": [
    { "date": "2026-02-01", "value": 40 },
    { "date": "2026-02-02", "value": 55 }
  ],
  "applicationStatus": [
    { "status": "pending", "count": 120 },
    { "status": "shortlisted", "count": 80 }
  ],
  "topJobs": [
    { "jobId": 7, "title": "Telematics Application Engineer", "applicationCount": 34 }
  ],
  "applicationTrends": [
    { "date": "2026-02-01", "value": 40 },
    { "date": "2026-02-02", "value": 55 }
  ]
}
```

Suggested usage:

- **Applications over time** → `applicationTrends` or `applicationRates` line chart.
- **Applications by status** → `applicationStatus` (stacked bar / pie).
- **Top jobs by applications** → `topJobs` table (job title + applicationCount).

---

## 6. Permissions and routing

- All endpoints in this doc require:
  - Valid **admin JWT** (`Authorization: Bearer <token>`).
  - Permission **`view_analytics`** (checked by `AdminPermissionGuard`).
- Frontend should:
  - Hide the **Analytics / Dashboard** menu items if `view_analytics` is not present in the admin permissions array from `/api/admin/auth/login` or `/api/admin/auth/permissions`.

---

## 7. Summary

- Use **`GET /api/admin/dashboard/stats`** for the **top summary cards**.
- Use **`GET /api/admin/dashboard/analytics/users`** for **user charts and lists**.
- Use **`GET /api/admin/dashboard/analytics/jobs`** for **job-related charts**.
- Use **`GET /api/admin/dashboard/analytics/applications`** for **application-related charts and top-job lists**.

All heavy aggregation is done in the database; the admin UI should only call these endpoints and render the returned data, without trying to compute global metrics from low-level lists.

