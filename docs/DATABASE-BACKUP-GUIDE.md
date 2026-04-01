# Database Backup and Fix Guide

## 🎯 Objective
1. Create a database backup for safe keeping
2. Fix database connection issues
3. Ensure the server can connect to the database

## 📋 Prerequisites

### Option 1: Docker Desktop (Recommended)
1. **Install Docker Desktop** (if not already installed)
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Verify Docker is running**
   ```bash
   docker info
   ```

3. **Run the backup script**
   ```bash
   ./backup-and-fix-db.sh
   ```

### Option 2: Local PostgreSQL Installation
1. **Install PostgreSQL via Homebrew**
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create database and user**
   ```bash
   createdb jobsmato_db
   psql jobsmato_db
   ```
   ```sql
   CREATE USER jobsmato_user WITH PASSWORD 'jobsmato_password';
   GRANT ALL PRIVILEGES ON DATABASE jobsmato_db TO jobsmato_user;
   \q
   ```

3. **Create backup manually**
   ```bash
   pg_dump -U jobsmato_user jobsmato_db > backups/jobsmato_db_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

### Option 3: Production Database Backup
If you have access to production database:

```bash
# SSH to production server
ssh user@your-production-server

# Create backup
docker exec jobsmato_postgres pg_dump -U jobsmato_user jobsmato_db > backup_$(date +%Y%m%d).sql

# Download backup
scp user@your-production-server:~/backup_*.sql ./backups/
```

## 🚀 Quick Start (Docker)

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in menu bar)

2. **Run the backup script**
   ```bash
   ./backup-and-fix-db.sh
   ```

3. **Start your server**
   ```bash
   npm run start:dev
   ```

## 📁 Backup Location

Backups are saved to: `./backups/jobsmato_db_backup_YYYYMMDD_HHMMSS.sql`

## 🔧 Manual Backup Commands

### Using Docker
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for it to be ready
docker exec jobsmato_postgres pg_isready -U jobsmato_user -d jobsmato_db

# Create backup
docker exec jobsmato_postgres pg_dump -U jobsmato_user jobsmato_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backups/
```

### Restore Backup
```bash
# Restore from backup
docker exec -i jobsmato_postgres psql -U jobsmato_user jobsmato_db < backups/backup_YYYYMMDD_HHMMSS.sql
```

## ✅ Verification

After setup, verify the connection:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec jobsmato_postgres psql -U jobsmato_user -d jobsmato_db -c "SELECT 1;"

# Check tables
docker exec jobsmato_postgres psql -U jobsmato_user -d jobsmato_db -c "\dt"
```

## 🐛 Troubleshooting

### Docker Not Running
- **Error:** `Cannot connect to the Docker daemon`
- **Solution:** Start Docker Desktop application

### Port Already in Use
- **Error:** `port 5432 is already in use`
- **Solution:** 
  ```bash
  # Find what's using the port
  lsof -i :5432
  
  # Stop the process or change port in docker-compose.yml
  ```

### Database Connection Failed
- **Error:** `Unable to connect to the database`
- **Solution:**
  1. Check if container is running: `docker ps`
  2. Check container logs: `docker logs jobsmato_postgres`
  3. Verify credentials in `.env` file

### Permission Denied
- **Error:** `permission denied`
- **Solution:**
  ```bash
  # Fix permissions
  chmod +x backup-and-fix-db.sh
  ```

## 📝 Environment Variables

Make sure your `.env` file has:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=jobsmato_user
DB_PASSWORD=jobsmato_password
DB_NAME=jobsmato_db
```

## 🔄 Next Steps

After database is running:
1. ✅ Database backup created
2. ✅ Database connection verified
3. ✅ Start NestJS server: `npm run start:dev`
4. ✅ Server will automatically connect and run migrations

