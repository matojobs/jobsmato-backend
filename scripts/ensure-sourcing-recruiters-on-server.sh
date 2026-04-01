#!/bin/bash
# Minimal fallback: creates only sourcing.recruiters (not the full datalake).
# Prefer the proper fix: node scripts/fix-prod-sourcing-migrations.js (creates full sourcing schema).
# Run once on server if you see: relation "sourcing.recruiters" does not exist
docker exec -i jobsmato_postgres psql -U jobsmato_user -d jobsmato_db << 'SQLEOF'
CREATE SCHEMA IF NOT EXISTS sourcing;

CREATE TABLE IF NOT EXISTS sourcing.recruiters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_recruiters_name ON sourcing.recruiters (name);
CREATE INDEX IF NOT EXISTS idx_recruiters_active ON sourcing.recruiters (is_active);
SQLEOF
echo "Done. sourcing.recruiters is ready."
