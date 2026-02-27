# Server Preparation Checklist

This document outlines what needs to be checked and prepared on the server before deployment.

## Prerequisites Check

### ✅ System Requirements
- [ ] Linux-based OS (Ubuntu/Debian/Amazon Linux)
- [ ] At least 2GB RAM
- [ ] At least 10GB free disk space
- [ ] Network connectivity

### ✅ Software Installation
- [ ] Docker installed and running
- [ ] Docker Compose available (via `docker compose` or `docker-compose`)
- [ ] User has Docker permissions (in `docker` group)

### ✅ Network Setup
- [ ] Docker network `jobsmato_network` created
- [ ] Ports available:
  - [ ] 5000 (API)
  - [ ] 5432 (PostgreSQL)
  - [ ] 6379 (Redis)

### ✅ Directory Structure
- [ ] `/home/jobsmato/uploads` - For file uploads
- [ ] `/home/jobsmato/uploads/Resumes` - For resume files
- [ ] `/home/jobsmato/logs` - For application logs
- [ ] `/home/jobsmato/backups` - For database backups

### ✅ Security
- [ ] SSH key authentication working
- [ ] Firewall configured (if applicable)
- [ ] User permissions set correctly

## Automated Preparation

Run the preparation script:

```powershell
.\prepare-server.ps1
```

This script will:
1. ✅ Check Docker installation
2. ✅ Check Docker Compose availability
3. ✅ Start Docker daemon if needed
4. ✅ Create Docker network
5. ✅ Create necessary directories
6. ✅ Check port availability
7. ✅ Verify user permissions
8. ✅ Display system information

## Manual Preparation (if needed)

### Install Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Amazon Linux:**
```bash
sudo yum install docker -y
sudo service docker start
sudo usermod -aG docker ec2-user
```

### Install Docker Compose

Docker Compose is usually included with Docker Desktop or can be installed as a plugin:
```bash
# For Docker Compose v2 (plugin)
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Or use standalone docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Create Directories

```bash
mkdir -p ~/uploads/Resumes
mkdir -p ~/logs
mkdir -p ~/backups
chmod 755 ~/uploads ~/logs ~/backups
```

### Create Docker Network

```bash
docker network create jobsmato_network
```

### Verify Installation

```bash
# Check Docker
docker --version
docker ps

# Check Docker Compose
docker compose version
# or
docker-compose --version

# Check network
docker network ls | grep jobsmato_network
```

## Post-Preparation Verification

After running the preparation script, verify:

1. **Docker is running:**
   ```bash
   sudo systemctl status docker
   ```

2. **User can run Docker without sudo:**
   ```bash
   docker ps
   ```

3. **Docker Compose works:**
   ```bash
   docker compose version
   ```

4. **Network exists:**
   ```bash
   docker network inspect jobsmato_network
   ```

5. **Directories exist:**
   ```bash
   ls -la ~/uploads ~/logs ~/backups
   ```

## Troubleshooting

### Docker Permission Denied

**Solution:**
```bash
sudo usermod -aG docker $USER
# Log out and log back in
newgrp docker
```

### Docker Daemon Not Running

**Solution:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Port Already in Use

**Solution:**
```bash
# Find process using port
sudo lsof -i :5000
# or
sudo netstat -tlnp | grep :5000

# Stop the process or change port in docker-compose.yml
```

### Network Creation Fails

**Solution:**
```bash
# Remove existing network if it exists
docker network rm jobsmato_network

# Create again
docker network create jobsmato_network
```

## Ready for Deployment

Once all checks pass, you're ready to deploy:

```powershell
.\deploy.ps1
```

Or with migrations:

```powershell
.\deploy-with-migration.ps1
```
