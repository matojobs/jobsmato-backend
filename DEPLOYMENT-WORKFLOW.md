# 🚀 Complete Deployment Workflow

This document outlines the complete workflow for preparing, improving, and deploying to the new server.

## Workflow Steps

### Step 1: Prepare Server ✅
**Script:** `prepare-server.ps1`

This step prepares the server for deployment:
- Checks Docker installation
- Verifies Docker Compose availability
- Creates necessary directories
- Sets up Docker network
- Checks port availability
- Verifies user permissions

**Run:**
```powershell
.\prepare-server.ps1
```

**What it does:**
1. Connects via Cloudflare Tunnel
2. Checks and installs Docker if needed
3. Creates directories: `~/uploads`, `~/logs`, `~/backups`
4. Creates Docker network: `jobsmato_network`
5. Verifies system resources

---

### Step 2: Implement Improvements ✅
**Status:** All improvements implemented

The following improvements have been added:

#### 2.1 Enhanced Health Check ✅
- **Files Modified:**
  - `src/app.service.ts` - Added database and Redis health checks
  - `src/app.controller.ts` - Enhanced health endpoint response

- **Features:**
  - Database connectivity check
  - Redis connectivity check
  - Response time tracking
  - Service status reporting

#### 2.2 Backup Script ✅
- **File:** `backup-database.ps1`
- **Features:**
  - Automated database backups
  - Backup compression (gzip)
  - 7-day retention policy
  - Automatic cleanup of old backups

#### 2.3 Rollback Mechanism ✅
- **File:** `rollback-deployment.ps1`
- **Features:**
  - Automatic image tagging (previous/current)
  - Quick rollback to previous version
  - Health check before rollback
  - Verification after rollback

#### 2.4 Deployment Verification ✅
- **File:** `verify-deployment.ps1`
- **Features:**
  - Container status checks
  - Health endpoint testing
  - Database connectivity tests
  - Redis connectivity tests
  - Error log checking
  - Resource usage monitoring

---

### Step 3: Deploy Application 🚀
**Script:** `deploy.ps1` or `deploy-with-migration.ps1`

**Basic Deployment:**
```powershell
.\deploy.ps1
```

**With Database Migrations:**
```powershell
.\deploy-with-migration.ps1
```

**What it does:**
1. Builds Docker image locally
2. Tags current image as 'previous' (for rollback)
3. Uploads image and docker-compose.yml
4. Deploys via Docker Compose
5. Verifies deployment

---

### Step 4: Verify Deployment ✅
**Script:** `verify-deployment.ps1`

**Run:**
```powershell
.\verify-deployment.ps1
```

**What it checks:**
- Container status
- Health endpoint
- Database connection
- Redis connection
- API endpoints
- Error logs
- Resource usage

---

## Quick Reference

### All Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `prepare-server.ps1` | Prepare server | First time setup |
| `deploy.ps1` | Deploy application | Regular deployments |
| `deploy-with-migration.ps1` | Deploy with migrations | When DB schema changes |
| `verify-deployment.ps1` | Verify deployment | After deployment |
| `backup-database.ps1` | Backup database | Before major changes |
| `rollback-deployment.ps1` | Rollback deployment | If deployment fails |
| `ssh-connect.ps1` | Quick SSH access | Manual server access |

### Typical Deployment Flow

```powershell
# 1. Prepare server (first time only)
.\prepare-server.ps1

# 2. Backup database (recommended before deployment)
.\backup-database.ps1

# 3. Deploy application
.\deploy.ps1
# OR with migrations:
.\deploy-with-migration.ps1

# 4. Verify deployment
.\verify-deployment.ps1

# 5. If issues occur, rollback
.\rollback-deployment.ps1
```

## Server Information

- **Domain:** `ssh.jobsmato.com` (via Cloudflare Tunnel)
- **SSH User:** `jobsmato`
- **SSH Port:** 2222 (local proxy) → 22 (server)
- **SSH Key:** `E:\git ssh key\id_ed25519_github`

## Directory Structure on Server

```
/home/jobsmato/
├── uploads/
│   └── Resumes/          # Resume files
├── logs/                 # Application logs
├── backups/              # Database backups
├── docker-compose.yml    # Docker Compose config
└── jobsmato-backend.tar.gz  # Docker image (temporary)
```

## Docker Services

- **jobsmato_api** - NestJS backend (port 5000)
- **jobsmato_postgres** - PostgreSQL database (port 5432)
- **jobsmato_redis** - Redis cache (port 6379)

## Health Check Endpoint

**URL:** `https://api.jobsmato.com/api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    }
  }
}
```

## Troubleshooting

### Connection Issues
- Make sure cloudflared is installed
- Check Cloudflare Tunnel is active
- Verify SSH key path is correct

### Deployment Issues
- Check container logs: `.\ssh-connect.ps1` then `docker logs jobsmato_api`
- Verify health endpoint: `curl http://localhost:5000/api/health`
- Check resource usage: `docker stats`

### Rollback Issues
- Previous image must exist (tagged as 'previous')
- Check if rollback was successful: `.\verify-deployment.ps1`

## Next Steps

1. ✅ Server preparation complete
2. ✅ Improvements implemented
3. 🚀 Ready to deploy!

Run the deployment:
```powershell
.\deploy.ps1
```
