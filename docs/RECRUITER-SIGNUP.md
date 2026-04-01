# Recruiter Signup / Registration

## Current State

### How Recruiter Signup Works

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "recruiter@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "recruiter",
  "phone": "+1234567890",  // optional
  "location": "New York, NY"  // optional
}
```

### What Happens

1. ✅ **User created** in `users` table with `role = 'recruiter'`
2. ✅ **JWT tokens** generated and returned
3. ❌ **NO record created** in `sourcing.recruiters` table

### The Problem

The recruiter service (`RecruiterService`) **requires** a record in `sourcing.recruiters` table to function. The `getRecruiterIdByEmail()` method looks up the recruiter ID from `sourcing.recruiters` and throws `NotFoundException` if it doesn't exist.

**Result:** A recruiter who signs up via `/api/auth/register` can:
- ✅ Login successfully
- ✅ Get JWT token
- ❌ **Cannot use recruiter endpoints** (will get "Recruiter not found" errors)

---

## Create Recruiter via Admin (recommended)

Admins can create users (including recruiters) via the admin API. When role is `recruiter`, both the **user** and the **sourcing.recruiters** record are created.

**Endpoint:** `POST /api/admin/users`  
**Auth:** Admin JWT + permission `create_users`

**Request body:**
```json
{
  "email": "recruiter@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "recruiter",
  "phone": "+1234567890",
  "location": "New York, NY"
}
```

**Response:** `{ "success": true, "user": { "id", "email", "firstName", "lastName", "role", ... } }` (password not returned)

The new recruiter can then log in with `POST /api/auth/login` and use all recruiter endpoints.

---

## Other Workarounds

### Setup script

```bash
node setup-recruiter-user.js
```

Creates a fixed test user and recruiter record (email: `recruiter@test.com`, password: `recruiter123`).

---

## Optional: Fix public signup

Update `auth.service.ts` `register()` method to also create `sourcing.recruiters` record when `role === UserRole.RECRUITER`, similar to how it creates a company for `UserRole.EMPLOYER`.

**Proposed change:**

```typescript
// In auth.service.ts register() method, after user creation:

if (role === UserRole.EMPLOYER) {
  // ... existing company creation code ...
}

// ADD THIS:
if (role === UserRole.RECRUITER) {
  // Create recruiter record in sourcing.recruiters
  const recruiterInsertQuery = `
    INSERT INTO sourcing.recruiters (name, email, phone, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `;
  await queryRunner.manager.query(recruiterInsertQuery, [
    `${firstName} ${lastName}`,
    email,
    phone || null,
  ]);
}
```

This ensures recruiter signup is **complete** and they can immediately use recruiter endpoints.

---

## Summary

| Method | User Created? | Recruiter Record Created? | Can Use Recruiter APIs? |
|--------|---------------|---------------------------|-------------------------|
| `/api/auth/register` with `role: "recruiter"` | ✅ Yes | ❌ No | ❌ No |
| **`POST /api/admin/users`** (admin, role: recruiter) | ✅ Yes | ✅ Yes | ✅ Yes |
| `setup-recruiter-user.js` script | ✅ Yes | ✅ Yes | ✅ Yes |

**Recommendation:** Create recruiters via **Admin** (`POST /api/admin/users`) so both user and recruiter record exist. Optionally, update `auth.service.ts` to create `sourcing.recruiters` on public signup with `role: "recruiter"`.
