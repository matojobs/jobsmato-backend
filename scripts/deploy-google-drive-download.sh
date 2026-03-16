#!/bin/bash

# Deployment script for Google Drive Download Support
# This script deploys the updated backend with Google Drive download capability

set -e

echo "🚀 Deploying Google Drive Download Support"
echo "==========================================="
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

# --- Step 0: Build Docker image and save it ---
echo -e "${YELLOW}Step 0: Building Docker image...${NC}"
docker build --platform linux/amd64 -t jobsmato-backend:latest .
echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

echo -e "${YELLOW}Step 0.1: Saving Docker image...${NC}"
docker save jobsmato-backend:latest | gzip > "${IMAGE_FILE}"
echo -e "${GREEN}✅ Docker image saved: ${IMAGE_FILE} ($(du -h "${IMAGE_FILE}" | awk '{print $1}'))${NC}"
echo ""

# --- Step 1: Upload Docker image and docker-compose.yml to server ---
echo -e "${YELLOW}Step 1: Uploading Docker image...${NC}"
scp -i "${PEM_KEY}" "${IMAGE_FILE}" "${SERVER_USER}@${SERVER_IP}:/home/${SERVER_USER}/"
echo -e "${GREEN}✅ Docker image uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 2: Uploading docker-compose.yml...${NC}"
scp -i "${PEM_KEY}" "${COMPOSE_FILE}" "${SERVER_USER}@${SERVER_IP}:/home/${SERVER_USER}/"
echo -e "${GREEN}✅ docker-compose.yml uploaded${NC}"
echo ""

# --- Step 3: Deploy on server ---
echo -e "${YELLOW}Step 3: Deploying on server...${NC}"
ssh -i "${PEM_KEY}" "${SERVER_USER}@${SERVER_IP}" << EOF
  echo "Loading Docker image..."
  docker load < "${IMAGE_FILE}"
  echo "Stopping existing containers..."
  docker-compose -f "${COMPOSE_FILE}" down
  echo "Starting services..."
  docker-compose -f "${COMPOSE_FILE}" up -d
  echo "Waiting for services to be healthy..."
  sleep 10
  docker-compose -f "${COMPOSE_FILE}" ps
EOF
echo -e "${GREEN}✅ Deployment completed${NC}"
echo ""

# --- Step 4: Verify deployment ---
echo -e "${YELLOW}Step 4: Verifying deployment...${NC}"
ssh -i "${PEM_KEY}" "${SERVER_USER}@${SERVER_IP}" << EOF
  echo "Checking API health..."
  curl -s http://localhost:5000/health || echo "⚠️  Health check failed"
  echo ""
  echo "Checking container logs..."
  docker logs jobsmato_api --tail 30
EOF
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo ""

echo "📝 Next Steps:"
echo "  1. Test the API endpoint: GET https://api.jobsmato.com/api/files/download/resume/{google_drive_url}"
echo "  2. Verify Google Drive files can be downloaded"
echo "  3. Test with both Google Drive URLs and file IDs"

