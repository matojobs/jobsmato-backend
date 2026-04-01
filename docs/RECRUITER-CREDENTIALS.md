# Recruiter Portal - Test Credentials

## 🔑 Default Test Recruiter Account

### Credentials
- **Email:** `recruiter@test.com`
- **Password:** `recruiter123`
- **Role:** `recruiter`

### User Details
- **Name:** Test Recruiter
- **Phone:** +91 9876543210

---

## 🚀 Quick Login Example

### Using cURL
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "recruiter@test.com",
    "password": "recruiter123"
  }'
```

### Using Postman
1. **Method:** POST
2. **URL:** `http://localhost:5000/api/auth/login`
3. **Headers:** `Content-Type: application/json`
4. **Body:**
```json
{
  "email": "recruiter@test.com",
  "password": "recruiter123"
}
```

### Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "recruiter@test.com",
    "role": "recruiter"
  }
}
```

---

## 📝 Using the Token

After login, use the `accessToken` in all recruiter API requests:

```bash
curl -X GET http://localhost:5000/api/recruiter/applications \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>"
```

---

## 🔧 Setup Script

If the recruiter user doesn't exist, run:

```bash
node setup-recruiter-user.js
```

This script will:
1. Create user account with email `recruiter@test.com`
2. Create recruiter record in `sourcing.recruiters` table
3. Set password to `recruiter123`
4. Ensure user has `recruiter` role

---

## ⚠️ Important Notes

1. **Email Match:** The user email must match the recruiter record email in `sourcing.recruiters` table
2. **Active Status:** Both user and recruiter record must be active
3. **Role:** User must have `role = 'recruiter'` in the `users` table
4. **Production:** Change these credentials before deploying to production!

---

## 🧪 Test All Endpoints

Once logged in, test recruiter endpoints:

```bash
# Get applications
GET /api/recruiter/applications

# Get companies
GET /api/recruiter/companies

# Get dashboard stats
GET /api/recruiter/dashboard/stats

# Get pipeline
GET /api/recruiter/dashboard/pipeline
```

All endpoints require the JWT token in the Authorization header.
