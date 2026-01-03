#!/bin/bash

set -e

echo "🗄️  Database Backup and Fix Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-jobsmato_user}"
DB_PASS="${DB_PASSWORD:-jobsmato_password}"
DB_NAME="${DB_NAME:-jobsmato_db}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/jobsmato_db_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📋 Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Step 1: Check Docker
echo "🐳 Step 1: Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo ""
    echo "Please start Docker Desktop and try again."
    echo "Or install PostgreSQL locally and update .env file."
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Step 2: Start PostgreSQL container
echo "🚀 Step 2: Starting PostgreSQL container..."
if docker ps -a --format '{{.Names}}' | grep -q "^jobsmato_postgres$"; then
    echo "  Container exists, starting..."
    docker start jobsmato_postgres > /dev/null 2>&1 || true
else
    echo "  Creating new container..."
    docker-compose up -d postgres
fi

# Wait for PostgreSQL to be ready
echo "  Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec jobsmato_postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        exit 1
    fi
done
echo ""

# Step 3: Create database backup
echo "💾 Step 3: Creating database backup..."
echo "  Backup file: $BACKUP_FILE"

if docker exec jobsmato_postgres pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully${NC}"
    echo "  Size: $BACKUP_SIZE"
    echo "  Location: $BACKUP_FILE"
else
    echo -e "${YELLOW}⚠️  Backup failed or database is empty${NC}"
    echo "  This might be a new database. Continuing..."
fi
echo ""

# Step 4: Check database connection
echo "🔍 Step 4: Checking database connection..."
if docker exec jobsmato_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    
    # Get database info
    TABLE_COUNT=$(docker exec jobsmato_postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    echo "  Tables found: ${TABLE_COUNT:-0}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi
echo ""

# Step 5: Run migrations (if needed)
echo "🔄 Step 5: Checking for pending migrations..."
# This would be handled by the NestJS app when it starts
echo "  Migrations will run automatically when server starts"
echo ""

# Summary
echo "===================================="
echo -e "${GREEN}✅ Database Setup Complete!${NC}"
echo "===================================="
echo ""
echo "📋 Summary:"
echo "  ✅ Docker is running"
echo "  ✅ PostgreSQL container is running"
if [ -f "$BACKUP_FILE" ]; then
    echo "  ✅ Backup created: $BACKUP_FILE"
fi
echo "  ✅ Database connection verified"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start your NestJS server: npm run start:dev"
echo "  2. The server will automatically connect to the database"
echo "  3. Migrations will run if needed"
echo ""
echo "💾 Backup Location:"
echo "  $BACKUP_FILE"
echo ""

