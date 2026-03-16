#!/bin/bash

# Deployment script for Resume Download Route Fix
# This script deploys the updated backend with query parameter support for Google Drive URLs

set -e

echo "🚀 Deploying Resume Download Route Fix"
echo "======================================="
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

# --- Step 1: Build Docker image ---
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build --platform linux/amd64 -t jobsmato-backend:latest .
echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

# --- Step 2: Save Docker image ---
echo -e "${YELLOW}Step 2: Saving Docker image...${NC}"
docker save jobsmato-backend:latest | gzip > "${IMAGE_FILE}"
echo -e "${GREEN}✅ Docker image saved: ${IMAGE_FILE} ($(du -h "${IMAGE_FILE}" | awk '{print $1}'))${NC}"
echo ""

# --- Step 3: Upload Docker image to server ---
echo -e "${YELLOW}Step 3: Uploading Docker image to server...${NC}"
scp -i "${PEM_KEY}" "${IMAGE_FILE}" "${SERVER_USER}@${SERVER_IP}:/home/${SERVER_USER}/" || {
    echo -e "${RED}❌ Failed to upload Docker image${NC}"
    exit 1
}
echo -e "${GREEN}✅ Docker image uploaded${NC}"
echo ""

# --- Step 4: Upload docker-compose.yml ---
echo -e "${YELLOW}Step 4: Uploading docker-compose.yml...${NC}"
scp -i "${PEM_KEY}" "${COMPOSE_FILE}" "${SERVER_USER}@${SERVER_IP}:/home/${SERVER_USER}/" || {
    echo -e "${RED}❌ Failed to upload docker-compose.yml${NC}"
    exit 1
}
echo -e "${GREEN}✅ docker-compose.yml uploaded${NC}"
echo ""

# --- Step 5: Deploy on server ---
echo -e "${YELLOW}Step 5: Deploying on server...${NC}"
ssh -i "${PEM_KEY}" "${SERVER_USER}@${SERVER_IP}" << 'ENDSSH'
    echo "Loading Docker image..."
    docker load < jobsmato-backend.tar.gz
    
    echo "Stopping existing containers..."
    docker-compose down || true
    
    echo "Starting services..."
    docker-compose up -d
    
    echo "Waiting for services to be healthy..."
    sleep 15
    
    echo "Checking container status..."
    docker-compose ps
    
    echo "Checking API logs..."
    docker-compose logs api --tail=20
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo "📋 Changes deployed:"
    echo "  - Resume download route now uses query parameters"
    echo "  - Google Drive URLs: GET /api/files/download/resume?url=..."
    echo "  - Local files: GET /api/files/download/resume?filename=..."
    echo ""
    echo "🧪 Test the endpoint:"
    echo "  curl -H 'Authorization: Bearer TOKEN' 'https://api.jobsmato.com/api/files/download/resume?url=https://drive.google.com/file/d/FILE_ID/view'"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

