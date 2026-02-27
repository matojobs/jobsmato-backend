#!/bin/bash
# Deploy via Cloudflare Tunnel (same approach as Jan 20, 2026).
# 1. In another terminal run: cloudflared access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
# 2. Then run: ./deploy.sh

set -e

echo "Deploying Jobsmato Backend (via Cloudflare Tunnel)"
echo "==================================================="
echo ""

# Config: tunnel = localhost:2222 when cloudflared is running
SSH_HOST="${SSH_HOST:-127.0.0.1}"
SSH_PORT="${SSH_PORT:-2222}"
SSH_USER="${SSH_USER:-jobsmato}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$SSH_KEY" ]; then
  KEY="$SSH_KEY"
elif [ -f "E:/git ssh key/id_ed25519_github" ]; then
  KEY="E:/git ssh key/id_ed25519_github"
elif [ -f "$SCRIPT_DIR/ssh-keys/id_ed25519_github" ]; then
  KEY="$SCRIPT_DIR/ssh-keys/id_ed25519_github"
else
  echo "Error: SSH key not found. Set SSH_KEY or use E:\\git ssh key\\id_ed25519_github or ssh-keys/id_ed25519_github"
  exit 1
fi

IMAGE_FILE="jobsmato-backend.tar"
COMPOSE_FILE="docker-compose.yml"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SSH_OPTS="-i \"$KEY\" -p $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=10"
SCP_OPTS="-i \"$KEY\" -P $SSH_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=60 -o ServerAliveInterval=20 -o ServerAliveCountMax=15"

# Optional: skip build (use existing image)
SKIP_BUILD="${SKIP_BUILD:-0}"

echo -e "${YELLOW}Step 0: Checking SSH (tunnel must be running)...${NC}"
if ! ssh -i "$KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SSH_USER@$SSH_HOST" "echo OK" 2>/dev/null | grep -q OK; then
  echo -e "${RED}SSH failed. Start cloudflared in another terminal:${NC}"
  echo "  cloudflared access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222"
  exit 1
fi
echo -e "${GREEN}SSH OK${NC}"
echo ""

if [ "$SKIP_BUILD" = "0" ]; then
  echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
  docker build --platform linux/amd64 -t jobsmato-backend:latest .
  echo -e "${GREEN}Image built${NC}"
  echo ""

  echo -e "${YELLOW}Step 2: Saving image to $IMAGE_FILE...${NC}"
  docker save -o "$IMAGE_FILE" jobsmato-backend:latest
  echo -e "${GREEN}Saved $(du -h "$IMAGE_FILE" | awk '{print $1}')${NC}"
  echo ""
else
  if [ ! -f "$IMAGE_FILE" ]; then
    echo -e "${RED}$IMAGE_FILE not found. Run without SKIP_BUILD=1 or build first.${NC}"
    exit 1
  fi
  echo -e "${YELLOW}Skipping build (using existing $IMAGE_FILE)${NC}"
  echo ""
fi

echo -e "${YELLOW}Step 3: Uploading image and docker-compose.yml...${NC}"
scp -i "$KEY" -P "$SSH_PORT" -o StrictHostKeyChecking=no -o ServerAliveInterval=20 -o ServerAliveCountMax=15 "$IMAGE_FILE" "$COMPOSE_FILE" "$SSH_USER@$SSH_HOST:/home/$SSH_USER/" || {
  echo -e "${RED}Upload failed${NC}"
  exit 1
}
echo -e "${GREEN}Uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 4: Deploying on server...${NC}"
ssh -i "$KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ServerAliveInterval=30 "$SSH_USER@$SSH_HOST" << ENDSSH
  set -e
  echo "Loading image..."
  docker load -i $IMAGE_FILE
  echo "Stopping existing containers..."
  docker-compose -f $COMPOSE_FILE down || true
  echo "Starting services..."
  docker-compose -f $COMPOSE_FILE up -d
  echo "Removing old/unused images..."
  docker image prune -f
  echo "Waiting..."
  sleep 10
  docker-compose -f $COMPOSE_FILE ps
ENDSSH
echo -e "${GREEN}Deploy done${NC}"
echo ""

echo -e "${YELLOW}Step 5: Verify...${NC}"
ssh -i "$KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'ENDSSH'
  curl -sf http://localhost:5004/api/health && echo "" || echo "Health check failed"
  docker logs jobsmato_api --tail 20
ENDSSH

echo ""
echo -e "${GREEN}Deployment completed.${NC}"
echo "  1. API: https://api.jobsmato.com/api/health"
echo "  2. Docs: https://api.jobsmato.com/api/docs"
echo "  3. Logs: ssh then 'docker logs -f jobsmato_api'"
