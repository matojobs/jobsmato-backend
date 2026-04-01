#!/bin/bash
# Adds 'recruiter' to users_role_enum and records migration 1700000000023 as run.
# Run on server once so prod DB and migrations table stay in sync.
docker exec -i jobsmato_postgres psql -U jobsmato_user -d jobsmato_db << 'SQLEOF'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'recruiter'
  ) THEN
    ALTER TYPE "users_role_enum" ADD VALUE 'recruiter';
  END IF;
END
$$;
INSERT INTO migrations (timestamp, name)
SELECT 1700000000023, 'AddRecruiterToUserRoleEnum1700000000023'
WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE timestamp = 1700000000023);
SQLEOF
echo "Done. 'recruiter' in enum and migration 1700000000023 recorded."
