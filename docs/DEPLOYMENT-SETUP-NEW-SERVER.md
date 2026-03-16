# 🚀 Deployment Setup for New Server (ssh.jobsmato.com)

## Overview

The deployment process has been updated to work with the new server accessible via Cloudflare Tunnel through `ssh.jobsmato.com`.

## Prerequisites

1. **SSH Key**: `E:\git ssh key\id_ed25519_github`
2. **cloudflared**: Installed and in PATH (or `$env:USERPROFILE`)
3. **Docker Desktop**: For building images locally
4. **PowerShell**: For running deployment scripts

## Quick Start

### Basic Deployment (No Migrations)

```powershell
.\deploy.ps1
```

### Deployment with Database Migrations

```powershell
.\deploy-with-migration.ps1
```

### Skip Build (Use Existing Image)

```powershell
.\deploy.ps1 -SkipBuild
```

## How It Works

1. **Cloudflare Tunnel**: The script automatically starts a cloudflared proxy to connect via `ssh.jobsmato.com`
2. **Build**: Builds Docker image locally (unless `-SkipBuild` is used)
3. **Upload**: Uploads Docker image and `docker-compose.yml` via SCP through the tunnel
4. **Deploy**: SSH into server and runs `docker-compose up -d`
5. **Verify**: Checks API health and container logs
6. **Cleanup**: Stops the cloudflared proxy

## Server Configuration

- **Domain**: `ssh.jobsmato.com`
- **SSH User**: `jobsmato`
- **SSH Port**: 2222 (local proxy) → 22 (server)
- **SSH Key**: `E:\git ssh key\id_ed25519_github`

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Start Cloudflare Tunnel

```powershell
cd "E:\git ssh key"
$env:Path += ";$env:USERPROFILE"
cloudflared.exe access tcp --hostname ssh.jobsmato.com --url tcp://localhost:2222
```

Keep this running in a separate terminal.

### 2. Build and Save Docker Image

```powershell
docker build --platform linux/amd64 -t jobsmato-backend:latest .
docker save jobsmato-backend:latest | gzip > jobsmato-backend.tar.gz
```

### 3. Upload Files

```powershell
cd "E:\git ssh key"
scp -i ".\id_ed25519_github" -P 2222 ..\jobsmato-backend\jobsmato-backend.tar.gz jobsmato@localhost:/home/jobsmato/
scp -i ".\id_ed25519_github" -P 2222 ..\jobsmato-backend\docker-compose.yml jobsmato@localhost:/home/jobsmato/
```

### 4. Deploy on Server

```powershell
ssh -i ".\id_ed25519_github" -p 2222 jobsmato@localhost
```

Then on the server:
```bash
docker load < jobsmato-backend.tar.gz
docker-compose down
docker-compose up -d
docker-compose ps
```

## Troubleshooting

### Connection Issues

**Problem**: "Connection refused" or "Connection timeout"

**Solutions**:
1. Make sure cloudflared proxy is running
2. Check that the tunnel is active in Cloudflare dashboard
3. Verify DNS is resolving: `nslookup ssh.jobsmato.com`
4. Try restarting the cloudflared proxy

### SSH Key Issues

**Problem**: "Permission denied (publickey)"

**Solutions**:
1. Verify SSH key path: `E:\git ssh key\id_ed25519_github`
2. Check key permissions (should be readable)
3. Verify the key is added to the server's `~/.ssh/authorized_keys`

### Docker Build Issues

**Problem**: Build fails or image is too large

**Solutions**:
1. Check Docker Desktop is running
2. Clear Docker cache: `docker system prune -a`
3. Verify platform: `--platform linux/amd64` is required

### Deployment Issues

**Problem**: Containers fail to start

**Solutions**:
1. Check logs: `docker logs jobsmato_api`
2. Verify environment variables in `docker-compose.yml`
3. Check database connection: `docker exec jobsmato_api sh -c 'curl http://postgres:5432'`
4. Verify ports are not in use: `docker ps`

## Environment Variables

### Server `.env` (required for API startup)

**On the server**, in the same directory as `docker-compose.yml` (e.g. `/home/jobsmato/`), create a **`.env`** file. Do not commit this file. Docker Compose loads it when you run `docker compose up -d`, and substitutes variables like `${GOOGLE_CLIENT_ID:-}`.

The API **requires** these for startup (Google OAuth is mandatory; see [DEPLOYMENT-ACTIVITY-LOG.md](./DEPLOYMENT-ACTIVITY-LOG.md) and [ACTIVITY_LOG.md](./ACTIVITY_LOG.md) Google OAuth notes):

- **GOOGLE_CLIENT_ID** – from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
- **GOOGLE_CLIENT_SECRET**
- **GOOGLE_CALLBACK_URL** – full URL, e.g. `https://api.jobsmato.com/api/auth/google/callback` (must match Google Console redirect URI exactly)

Also ensure (in `.env` or in `docker-compose.yml`):

- Database credentials
- JWT secrets
- Google Drive credentials (if using resume download from Drive)
- SMTP settings
- Redis configuration

## Database Migrations

If you need to run migrations manually:

```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost
docker exec jobsmato_api sh -c 'cd /app && npm run migration:run'
```

Or use the migration script:
```powershell
.\deploy-with-migration.ps1
```

## Monitoring

### Check Container Status

```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost "docker-compose ps"
```

### View Logs

```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost "docker logs -f jobsmato_api"
```

### Check API Health

```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost "curl http://localhost:5000/health"
```

## Rollback

If deployment fails, you can rollback:

```powershell
ssh -i "E:\git ssh key\id_ed25519_github" -p 2222 jobsmato@localhost
docker-compose down
docker load < jobsmato-backend.tar.gz.old  # Previous image
docker-compose up -d
```

## Notes

- The cloudflared proxy is automatically started and stopped by the script
- Image size is typically ~96MB compressed
- Build time is usually 60-90 seconds
- Deployment takes ~30 seconds after upload

## Support

For issues:
1. Check container logs
2. Verify Cloudflare Tunnel status
3. Check server resources: `docker stats`
4. Review deployment logs in the script output
