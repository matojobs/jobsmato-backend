#!/bin/bash
# Server Setup Script
# Run this on the server to install Docker and prepare the environment

set -e

echo "=========================================="
echo "Jobsmato Server Setup Script"
echo "=========================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "This script needs to be run with sudo. Please run:"
    echo "  sudo bash server-setup.sh"
    exit 1
fi

echo "[STEP] Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

echo "[STEP] Adding jobsmato user to docker group..."
usermod -aG docker jobsmato

echo "[STEP] Starting Docker service..."
systemctl start docker
systemctl enable docker

echo "[STEP] Creating Docker network..."
docker network create jobsmato_network || echo "Network may already exist"

echo "[STEP] Creating necessary directories..."
mkdir -p /home/jobsmato/uploads/Resumes
mkdir -p /home/jobsmato/logs
mkdir -p /home/jobsmato/backups
chown -R jobsmato:jobsmato /home/jobsmato/uploads
chown -R jobsmato:jobsmato /home/jobsmato/logs
chown -R jobsmato:jobsmato /home/jobsmato/backups
chmod 755 /home/jobsmato/uploads
chmod 755 /home/jobsmato/logs
chmod 755 /home/jobsmato/backups

echo ""
echo "[OK] Server setup completed!"
echo ""
echo "Next steps:"
echo "  1. Log out and log back in (or run: newgrp docker)"
echo "  2. Verify Docker: docker --version"
echo "  3. Test Docker: docker ps"
echo ""
