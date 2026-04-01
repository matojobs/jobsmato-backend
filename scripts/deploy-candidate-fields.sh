#!/bin/bash

# Deployment script for Candidate Contact Fields feature
# This script deploys the updated backend and runs the migration

set -e

echo "🚀 Deploying Candidate Contact Fields Update"
echo "============================================"
echo ""

# Configuration
SERVER_IP="52.87.186.34"
SERVER_USER="ec2-user"
PEM_KEY="/Users/zoro/Downloads/jobsmato_new.pem"
IMAGE_FILE="jobsmato-backend.tar.gz"
COMPOSE_FILE="docker-compose.yml"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Upload Docker image
echo -e "${YELLOW}Step 1: Uploading Docker image...${NC}"
if [ ! -f "$IMAGE_FILE" ]; then
    echo -e "${RED}❌ Error: $IMAGE_FILE not found${NC}"
    echo "Building Docker image first..."
    docker build --platform linux/amd64 -t jobsmato-backend:latest .
    docker save jobsmato-backend:latest | gzip > "$IMAGE_FILE"
fi

scp -i "$PEM_KEY" "$IMAGE_FILE" "$SERVER_USER@$SERVER_IP:/home/$SERVER_USER/" || {
    echo -e "${RED}❌ Failed to upload Docker image${NC}"
    exit 1
}
echo -e "${GREEN}✅ Docker image uploaded${NC}"
echo ""

# Step 2: Upload docker-compose.yml
echo -e "${YELLOW}Step 2: Uploading docker-compose.yml...${NC}"
scp -i "$PEM_KEY" "$COMPOSE_FILE" "$SERVER_USER@$SERVER_IP:/home/$SERVER_USER/" || {
    echo -e "${RED}❌ Failed to upload docker-compose.yml${NC}"
    exit 1
}
echo -e "${GREEN}✅ docker-compose.yml uploaded${NC}"
echo ""

# Step 3: Deploy on server
echo -e "${YELLOW}Step 3: Deploying on server...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    echo "Loading Docker image..."
    docker load < jobsmato-backend.tar.gz
    
    echo "Stopping existing containers..."
    docker-compose down || true
    
    echo "Starting services..."
    docker-compose up -d
    
    echo "Waiting for services to be healthy..."
    sleep 10
    
    echo "Checking container status..."
    docker-compose ps
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment completed${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
echo ""

# Step 4: Run migration
echo -e "${YELLOW}Step 4: Running database migration...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    echo "Running migration: AddCandidateContactFieldsToJobApplication..."
    
    # Create migration script
    cat > /tmp/run-migration.js << 'EOFMIGRATION'
    const { DataSource } = require('typeorm');
    
    const AppDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'jobsmato_user',
      password: process.env.DB_PASSWORD || 'jobsmato_password',
      database: process.env.DB_NAME || 'jobsmato_db',
      synchronize: false,
      logging: true,
    });
    
    async function runMigration() {
      try {
        await AppDataSource.initialize();
        console.log('✅ Connected to database');
        
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
          // Add candidateName column
          await queryRunner.query(`
            ALTER TABLE "job_applications"
            ADD COLUMN IF NOT EXISTS "candidateName" character varying;
          `);
          
          // Add candidateEmail column
          await queryRunner.query(`
            ALTER TABLE "job_applications"
            ADD COLUMN IF NOT EXISTS "candidateEmail" character varying;
          `);
          
          // Add candidatePhone column
          await queryRunner.query(`
            ALTER TABLE "job_applications"
            ADD COLUMN IF NOT EXISTS "candidatePhone" character varying;
          `);
          
          await queryRunner.commitTransaction();
          console.log('✅ Migration completed successfully!');
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
        
        await AppDataSource.destroy();
      } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
      }
    }
    
    runMigration();
EOFMIGRATION
    
    # Run migration inside API container
    docker exec jobsmato_api node /tmp/run-migration.js || {
        echo "⚠️  Migration script not found in container, running directly..."
        docker exec -e DB_HOST=postgres -e DB_PORT=5432 -e DB_USERNAME=jobsmato_user -e DB_PASSWORD=jobsmato_password -e DB_NAME=jobsmato_db jobsmato_api sh -c '
            cd /app && node -e "
            const { DataSource } = require(\"typeorm\");
            const AppDataSource = new DataSource({
              type: \"postgres\",
              host: process.env.DB_HOST || \"postgres\",
              port: parseInt(process.env.DB_PORT || \"5432\"),
              username: process.env.DB_USERNAME || \"jobsmato_user\",
              password: process.env.DB_PASSWORD || \"jobsmato_password\",
              database: process.env.DB_NAME || \"jobsmato_db\",
              synchronize: false,
              logging: true,
            });
            (async () => {
              await AppDataSource.initialize();
              const qr = AppDataSource.createQueryRunner();
              await qr.connect();
              await qr.startTransaction();
              try {
                await qr.query(\"ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS candidateName character varying;\");
                await qr.query(\"ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS candidateEmail character varying;\");
                await qr.query(\"ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS candidatePhone character varying;\");
                await qr.commitTransaction();
                console.log(\"✅ Migration completed!\");
              } catch (e) {
                await qr.rollbackTransaction();
                throw e;
              } finally {
                await qr.release();
                await AppDataSource.destroy();
              }
            })();
            "
        '
    }
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Migration may have already been run or encountered an issue${NC}"
fi
echo ""

# Step 5: Verify deployment
echo -e "${YELLOW}Step 5: Verifying deployment...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    echo "Checking API health..."
    curl -f http://localhost:5004/health && echo "" || echo "⚠️  Health check failed"
    
    echo "Checking container logs..."
    docker logs jobsmato_api --tail 20
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo ""
echo "📝 Next Steps:"
echo "  1. Test the API endpoint: POST https://api.jobsmato.com/api/applications"
echo "  2. Verify the new fields are working correctly"
echo "  3. Share FRONTEND-APPLICATIONS-API-UPDATE.md with the frontend team"

