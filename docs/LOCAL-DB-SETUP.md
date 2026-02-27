# Local database setup

## One-command run (recommended)

```powershell
.\start-local.ps1
```

This script: kills any process on port 5000, starts Postgres via `docker compose -f docker-compose.local.yml up -d postgres`, sets DB credentials to match the container (`postgres` / `password`), and runs the backend. No manual steps.

## Using your own .env

The backend uses the database defined in your **`.env`** (e.g. `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`). For **docker-compose.local.yml** the container defines `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=jobsmato_db` — use these in `.env` so the app can connect:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=jobsmato_db
```

Then run `npm run start:dev` or `.\run-backend.ps1`. If port 5000 is in use, kill it first (see start-local.ps1 for the PowerShell one-liner).

## Create or reset admin user

Uses the same DB as your app (from `.env`):

```powershell
node scripts/create-admin-user.js --email admin@jobsmato.com --password "YourPassword"
```

Optional: `--first "Admin" --last "User"` to set name.
