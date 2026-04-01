#!/bin/bash
# Creates admin user in prod DB (run on server via SSH).
# Admin: admin@jobsmato.com / Password: Admin@123
docker exec -i jobsmato_postgres psql -U jobsmato_user -d jobsmato_db << 'SQLEOF'
INSERT INTO users (email, password, "firstName", "lastName", role, status, "createdAt", "updatedAt")
VALUES (
  'admin@jobsmato.com',
  '$2b$12$UOESBLj/SEQWMkuYeTDrXevweE9R7FYid3slKKpZut/9xSef3wC8C',
  'Admin',
  'User',
  'admin',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  password = EXCLUDED.password,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "updatedAt" = NOW();
SQLEOF
echo "Admin user created/updated: admin@jobsmato.com / Admin@123"
