# Fix: "password authentication failed for user jobsmato_user"

## Cause
The app is using `DB_USERNAME=jobsmato_user` (from your `.env`), but either:
- The user doesn't exist in PostgreSQL, or
- The password in `.env` doesn't match the one in the database.

---

## Option 1: Use the `postgres` user (fastest)

If you're running Postgres via Docker (`docker-compose.local.yml`), the default user is `postgres` with password `password`.

**In your `.env` set:**
```env
DB_USERNAME=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jobsmato_db
```

Then restart the backend. No database changes needed.

---

## Option 2: Create/reset `jobsmato_user` with password `password`

If you want to keep using `jobsmato_user`:

### Step 1: Run the fix SQL

**If using Docker**, run this in PowerShell (one line):
```powershell
docker exec -i jobsmato_postgres_local psql -U postgres -d jobsmato_db -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jobsmato_user') THEN CREATE ROLE jobsmato_user WITH LOGIN PASSWORD 'password'; ELSE ALTER ROLE jobsmato_user WITH PASSWORD 'password'; END IF; END \$\$; GRANT ALL PRIVILEGES ON DATABASE jobsmato_db TO jobsmato_user;"
```

Then grant schema permissions (run this second):
```powershell
docker exec -i jobsmato_postgres_local psql -U postgres -d jobsmato_db -c "GRANT ALL ON SCHEMA public TO jobsmato_user; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jobsmato_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jobsmato_user;"
```

**If using local PostgreSQL** (not Docker), run in psql:
```sql
-- In psql: psql -U postgres -d jobsmato_db
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jobsmato_user') THEN
    CREATE ROLE jobsmato_user WITH LOGIN PASSWORD 'password';
  ELSE
    ALTER ROLE jobsmato_user WITH PASSWORD 'password';
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE jobsmato_db TO jobsmato_user;
\c jobsmato_db
GRANT ALL ON SCHEMA public TO jobsmato_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jobsmato_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jobsmato_user;
```

### Step 2: Set `.env` to match
```env
DB_USERNAME=jobsmato_user
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jobsmato_db
```

### Step 3: Restart the backend
```bash
npx nest start
```

---

## Check that Postgres is running

**Docker:**
```bash
docker ps
# You should see jobsmato_postgres_local on port 5432
```

**Start Postgres (Docker):**
```bash
docker compose -f docker-compose.local.yml up -d
```

---

## Summary

| Your .env has        | Fix |
|----------------------|-----|
| `DB_USERNAME=jobsmato_user` | Run `fix-db-user.sql` so the user exists with password `password`, **or** change to `DB_USERNAME=postgres` and `DB_PASSWORD=password`. |
| `DB_USERNAME=postgres`      | Set `DB_PASSWORD=password` (matches docker-compose.local.yml). |

After changing `.env`, restart the backend.
