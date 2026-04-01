# Admin Login Credentials

**There is no default admin email or password in the repo.** Admins are created per environment using the create-admin script.

---

## Create an admin user

From the project root (with DB running and env configured):

```bash
npm run create:admin -- --email admin@example.com --password your_password
```

- **`--email`** (required): Admin login email.
- **`--password`** (optional): If omitted, a random password is generated and **printed to the console** (store it securely).
- **`--first`** (optional): First name.
- **`--last`** (optional): Last name.

**Examples:**

```bash
# Create admin with your chosen password
npm run create:admin -- --email admin@jobsmato.com --password Admin@123

# Create admin with random password (check console output for the password)
npm run create:admin -- --email admin@jobsmato.com

# Upgrade existing user to admin
npm run create:admin -- --email existing@example.com --password newpassword
```

---

## Login

- **Admin login endpoint:** `POST /api/admin/auth/login`
- **Body:** `{ "email": "admin@example.com", "password": "your_password" }`

Use the same email and password you set when running the create-admin script.

---

## Quick test admin (local only)

For local testing you can create a known admin:

```bash
npm run create:admin -- --email admin@test.com --password admin123
```

Then log in with:
- **Email:** `admin@test.com`
- **Password:** `admin123`

**Do not use these in production.**
