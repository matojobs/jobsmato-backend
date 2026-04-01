# 🚀 Jobsmato Backend Deployment Guide

This guide covers the complete deployment process for the Jobsmato backend, including recent infrastructure improvements and troubleshooting.

> **Deployment Reference**: Docker and docker-compose configuration follows `E:\New folder\jobsmato_backend` (successfully deployed Jan 20, 2026).

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Infrastructure Overview](#infrastructure-overview)
3. [Deployment Methods](#deployment-methods)
4. [SSL/HTTPS Setup](#sslhttps-setup)
5. [CORS Configuration](#cors-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

## 🚀 Quick Start

### Prerequisites
- Server accessible via Cloudflare Tunnel (`ssh.jobsmato.com`)
- SSH key: `E:\git ssh key\id_ed25519_github`
- cloudflared installed and in PATH
- Docker Desktop installed (for building images)
- PowerShell (for running deployment scripts)

### One-Command Deployment
```powershell
# Basic deployment (no migrations)
.\deploy.ps1

# Deployment with database migrations
.\deploy-with-migration.ps1

# Skip build (use existing image)
.\deploy.ps1 -SkipBuild
```

**Note**: For detailed setup instructions, see [DEPLOYMENT-SETUP-NEW-SERVER.md](./DEPLOYMENT-SETUP-NEW-SERVER.md)

## 🏗️ Infrastructure Overview

### Current Production Setup
- **Server**: Accessible via `ssh.jobsmato.com` (Cloudflare Tunnel)
- **SSH Access**: Via Cloudflare Tunnel on port 2222 (local) → 22 (server)
- **SSH User**: `jobsmato`
- **Web Server**: Nginx (reverse proxy)
- **SSL**: Configured via Cloudflare/domain
- **Backend**: NestJS in Docker container
- **Database**: PostgreSQL in Docker container
- **Cache**: Redis in Docker container
- **File Storage**: Google Drive integration

### Network Architecture
```
Internet → Nginx (443/80) → Backend Container (5004) → Database Container (5432)
                                ↓
                         Redis Container (6379)
```

## 🛠️ Deployment Methods

### Method 1: Automated PowerShell Script (Recommended)

**Advantages:**
- Fully automated deployment
- Automatic Cloudflare Tunnel management
- Built-in error handling and verification
- Support for database migrations

**Deployment:**
```powershell
# Basic deployment
.\deploy.ps1

# With database migrations
.\deploy-with-migration.ps1
```

**What it does:**
1. Starts Cloudflare Tunnel proxy automatically
2. Builds Docker image locally
3. Uploads image and docker-compose.yml via SCP
4. Deploys via Docker Compose on server
5. Runs database migrations (`run-migrations.js`), sourcing fix (`fix-prod-sourcing-migrations.js`), and recruiter-edit migrations (`run-recruiter-edit-migrations.js`) so 0028/0029 are applied even if full migrations fail
6. Verifies deployment
7. Cleans up tunnel proxy

### Method 2: Manual Deployment

**Steps:**
```powershell
# 1. Start Cloudflare Tunnel (in separate terminal)
cd "E:\git ssh key"
$env:Path += ";$env:USERPROFILE"
cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222

# 2. Build and save image
docker build --platform linux/amd64 -t jobsmato-backend:latest .
docker save jobsmato-backend:latest | gzip > jobsmato-backend.tar.gz

# 3. Upload files
cd "E:\git ssh key"
scp -i ".\id_ed25519_github" -P 2222 ..\jobsmato-backend\jobsmato-backend.tar.gz jobsmato@localhost:/home/jobsmato/
scp -i ".\id_ed25519_github" -P 2222 ..\jobsmato-backend\docker-compose.yml jobsmato@localhost:/home/jobsmato/

# 4. Deploy on server
ssh -i ".\id_ed25519_github" -p 2222 jobsmato@localhost
docker load < jobsmato-backend.tar.gz
docker-compose down
docker-compose up -d
```

### Method 3: Quick SSH Connection

Use the helper script for easy SSH access:
```powershell
.\ssh-connect.ps1
```

## 🔒 SSL/HTTPS Setup

### Current Implementation (Self-Signed Certificate)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name 15.134.85.184;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name 15.134.85.184;
    
    ssl_certificate /etc/ssl/certs/jobsmato.crt;
    ssl_certificate_key /etc/ssl/private/jobsmato.key;
    
    location /api/ {
        proxy_pass http://localhost:5004/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Upgrading to Let's Encrypt (Recommended)

**Prerequisites:**
- Domain name pointing to your server
- Ports 80 and 443 open in security group

**Installation:**
```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🌐 CORS Configuration

### Current CORS Setup

**Backend Configuration (main.ts):**
```typescript
app.enableCors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

**Nginx CORS Headers:**
```nginx
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization, Accept, Origin, X-Requested-With" always;
add_header Access-Control-Allow-Credentials "true" always;
```

### Frontend Configuration

**Environment Variables:**
```env
# .env.production
REACT_APP_API_URL=https://15.134.85.184/api

# .env.development
REACT_APP_API_URL=https://15.134.85.184/api
```

**API Configuration:**
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://15.134.85.184/api';
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Mixed Content Security Policy
**Symptom:** "Provisional headers are shown" in browser
**Cause:** Frontend (HTTPS) trying to access backend (HTTP)
**Solution:** Use HTTPS endpoint: `https://15.134.85.184/api`

#### 2. Database Connection Issues
**Symptom:** `ECONNREFUSED` or `ENOTFOUND postgres`
**Cause:** Container networking issues
**Solution:** Ensure containers are on same Docker network

#### 3. SSL Certificate Warnings
**Symptom:** Browser shows "Not Secure" warning
**Cause:** Self-signed certificate
**Solution:** Accept certificate or upgrade to Let's Encrypt

#### 4. CORS Preflight Failures
**Symptom:** OPTIONS requests failing
**Cause:** Missing CORS headers
**Solution:** Check Nginx and backend CORS configuration

#### 5. `relation "sourcing.recruiters" does not exist` (Prod)
**Symptom:** Admin create recruiter or recruiter portal returns 500 with this message.
**Cause:** Prod’s `migrations` table was seeded with migration names, so the sourcing DataLake migrations (1700000000020, 1700000000021) were never executed and the `sourcing` schema/tables are missing.
**Solution (proper fix):** Run the one-time fix script on the server so the full sourcing schema is created via migrations:

```bash
# On server (after SSH), from project directory with build present:
docker exec jobsmato_api node scripts/fix-prod-sourcing-migrations.js
```

This removes the two sourcing migration records from `migrations`, then runs only the sourcing migrations (CreateSourcingDataLake + ImproveSourcingDataLake). After this, admin create-recruiter and the recruiter portal work. See `scripts/fix-prod-sourcing-migrations.js` for details and local usage.

#### 6. Full migrations fail ("column already exists" or migrations table out of sync)
**Symptom:** During deploy, `run-migrations.js` fails (e.g. "column already exists") because the migrations table and DB schema are out of sync.
**Cause:** Older migrations were applied manually or the migrations table was reset; re-running all migrations tries to apply already-applied migrations.
**Solution:** The deploy script now runs **recruiter-edit migrations** (0028, 0029) after the main migrations so that recruiter Edit Candidate fields are applied even when the full migration run fails. To run only these migrations manually on the server:

```bash
# On server (after SSH):
docker exec jobsmato_api node -r dotenv/config scripts/run-recruiter-edit-migrations.js
```

This applies only:
- **1700000000028** – `sourcing.applications`: portal, not_interested_remark, interview_scheduled, turnup, backout_date, backout_reason, hiring_manager_feedback, followup_date, and call_status 5 (Switch off).
- **1700000000029** – `job_applications`: portal, assigned_date, recruiter_notes, not_interested_remark, interview_scheduled, interview_date, turnup, interview_status, selection_status, joining_status, joining_date, backout_date, backout_reason, hiring_manager_feedback, followup_date.

Safe to run multiple times (uses `IF NOT EXISTS`). See `scripts/run-recruiter-edit-migrations.js` for local usage.

### Debugging Commands

**Check Service Status:**
```bash
# Nginx status
sudo systemctl status nginx

# Docker containers
docker ps

# Container logs
docker logs jobsmato_api
docker logs jobsmato_postgres
docker logs jobsmato_redis
```

**Test API Endpoints:**
```powershell
# Connect via SSH first
.\ssh-connect.ps1

# Then on server:
curl http://localhost:5000/api/health
curl http://localhost:5000/api/jobs

# Or test from external:
curl https://api.jobsmato.com/api/health
curl https://api.jobsmato.com/api/jobs
```

**Network Diagnostics:**
```powershell
# Connect via SSH
.\ssh-connect.ps1

# Then on server:
# Check port availability
netstat -tlnp | grep :5000
docker ps

# Check container network
docker network inspect jobsmato_network
```

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Check service status
- Review error logs
- Monitor disk space
- Update security patches

**Monthly:**
- Review SSL certificate expiration
- Update Docker images
- Backup database
- Performance monitoring

### Backup Strategy

**Database Backup:**
```powershell
# Connect via SSH
.\ssh-connect.ps1

# Then on server:
# Create backup
docker exec jobsmato_postgres pg_dump -U jobsmato_user jobsmato_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i jobsmato_postgres psql -U jobsmato_user jobsmato_db < backup_20240101.sql
```

**Configuration Backup:**
```bash
# Backup Nginx config
sudo cp /etc/nginx/conf.d/jobsmato.conf ~/nginx_backup.conf

# Backup SSL certificates
sudo cp -r /etc/ssl/certs/jobsmato.crt ~/
sudo cp -r /etc/ssl/private/jobsmato.key ~/
```

### Monitoring

**Health Checks:**
```powershell
# Connect via SSH
.\ssh-connect.ps1

# Then on server:
# API health
curl http://localhost:5000/api/health

# Database health
docker exec jobsmato_postgres pg_isready -U jobsmato_user

# Redis health
docker exec jobsmato_redis redis-cli ping
```

**Log Monitoring:**
```powershell
# Connect via SSH
.\ssh-connect.ps1

# Then on server:
# Real-time logs
docker logs -f jobsmato_api

# Error logs
docker logs jobsmato_api 2>&1 | grep ERROR

# Or from local machine (if tunnel is running):
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost "docker logs -f jobsmato_api"
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review container logs
3. Verify network connectivity
4. Check SSL certificate status
5. Contact the development team

---

## 📚 Additional Resources

- **New Server Setup**: See [DEPLOYMENT-SETUP-NEW-SERVER.md](./DEPLOYMENT-SETUP-NEW-SERVER.md) for detailed setup instructions
- **SSH Connection**: Use `.\ssh-connect.ps1` for quick SSH access
- **Cloudflare Tunnel**: See `E:\git ssh key\SSH_VIA_DOMAIN.md` for tunnel configuration

---

**Last Updated:** December 2025
**Version:** 2.0.0
**Status:** Production Ready ✅
**Server:** ssh.jobsmato.com (Cloudflare Tunnel)