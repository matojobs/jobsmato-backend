# 🚀 Jobsmato Backend Deployment Guide

This guide covers the complete deployment process for the Jobsmato backend, including recent infrastructure improvements and troubleshooting.

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
- AWS EC2 instance (Amazon Linux 2023)
- PEM key for SSH access
- Docker and Docker Compose installed
- Domain name (optional, for Let's Encrypt)

### One-Command Deployment
```bash
# Deploy with Docker Compose (Recommended)
./deploy-with-compose.sh

# Or deploy with manual Docker run
./deploy-to-ec2.sh
```

## 🏗️ Infrastructure Overview

### Current Production Setup
- **Server**: AWS EC2 (15.134.85.184)
- **OS**: Amazon Linux 2023
- **Web Server**: Nginx 1.28.0 (reverse proxy)
- **SSL**: Self-signed certificate
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

### Method 1: Docker Compose (Recommended)

**Advantages:**
- Automatic service orchestration
- Built-in networking
- Easy scaling and management
- Environment variable management

**Deployment:**
```bash
./deploy-with-compose.sh
```

**Manual Steps:**
```bash
# 1. Build and upload image
docker build --platform linux/amd64 -t jobsmato-backend:latest .
docker save jobsmato-backend:latest | gzip > jobsmato-backend.tar.gz
scp -i jobsmato_backend.pem jobsmato-backend.tar.gz ec2-user@15.134.85.184:/home/ec2-user/

# 2. Upload docker-compose.yml
scp -i jobsmato_backend.pem docker-compose.yml ec2-user@15.134.85.184:/home/ec2-user/

# 3. Deploy on server
ssh -i jobsmato_backend.pem ec2-user@15.134.85.184
docker-compose up -d --build
```

### Method 2: Manual Docker Run

**Advantages:**
- Full control over container configuration
- Custom networking setup
- Direct environment variable management

**Deployment:**
```bash
./deploy-to-ec2.sh
```

**Manual Steps:**
```bash
# 1. Build and upload image
docker build --platform linux/amd64 -t jobsmato-backend:latest .
docker save jobsmato-backend:latest | gzip > jobsmato-backend.tar.gz
scp -i jobsmato_backend.pem jobsmato-backend.tar.gz ec2-user@15.134.85.184:/home/ec2-user/

# 2. Deploy on server
ssh -i jobsmato_backend.pem ec2-user@15.134.85.184
docker load < jobsmato-backend.tar.gz
docker network create jobsmato_network
docker run -d --name jobsmato-postgres --network jobsmato_network -e POSTGRES_DB=jobsmato_db -e POSTGRES_USER=jobsmato_user -e POSTGRES_PASSWORD=jobsmato_password postgres:15
docker run -d --name jobsmato-redis --network jobsmato_network redis:7-alpine
docker run -d --name jobsmato-backend --network jobsmato_network -p 5004:5000 -e DB_HOST=jobsmato-postgres jobsmato-backend:latest
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
```bash
# Test HTTPS endpoint
curl -k https://15.134.85.184/api/jobs

# Test CORS preflight
curl -k -X OPTIONS https://15.134.85.184/api/jobs \
  -H "Origin: https://jobsmato-frontend.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -I

# Test database connection
curl -k https://15.134.85.184/api/health
```

**Network Diagnostics:**
```bash
# Check port availability
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :5004

# Check SSL certificate
openssl s_client -connect 15.134.85.184:443 -servername 15.134.85.184
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
```bash
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
```bash
# API health
curl -k https://15.134.85.184/api/health

# Database health
docker exec jobsmato_postgres pg_isready -U jobsmato_user

# Redis health
docker exec jobsmato_redis redis-cli ping
```

**Log Monitoring:**
```bash
# Real-time logs
docker logs -f jobsmato_api
sudo journalctl -u nginx -f

# Error logs
docker logs jobsmato_api 2>&1 | grep ERROR
sudo journalctl -u nginx --since "1 hour ago" | grep error
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review container logs
3. Verify network connectivity
4. Check SSL certificate status
5. Contact the development team

---

**Last Updated:** September 25, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
