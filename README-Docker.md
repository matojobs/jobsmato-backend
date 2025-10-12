# 🐳 Jobsmato Backend - Docker Setup

Complete Docker setup for the Jobsmato NestJS backend with PostgreSQL, Redis, and Nginx.

## 🚀 Quick Start

### Prerequisites
- Docker (v20.10+)
- Docker Compose (v2.0+)

### One-Command Setup

```bash
# Development environment
./setup.sh dev

# Production environment
./setup.sh
```

## 📁 Docker Files

- `Dockerfile` - Production optimized build
- `Dockerfile.dev` - Development build with hot reload
- `docker-compose.yml` - Production services
- `docker-compose.dev.yml` - Development services
- `nginx.conf` - Reverse proxy configuration
- `init.sql` - Database initialization
- `.dockerignore` - Docker build exclusions

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   NestJS API    │    │   PostgreSQL    │
│   (Port 80)     │────│   (Port 5000)   │────│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Port 6379)   │
                       └─────────────────┘
```

## 🔧 Services

### 1. **NestJS API** (`api`)
- **Port**: 5000
- **Health Check**: `/health`
- **API Docs**: `/api/docs`
- **Environment**: Production/Development

### 2. **PostgreSQL Database** (`postgres`)
- **Port**: 5432
- **Database**: `jobsmato_db`
- **User**: `jobsmato_user`
- **Password**: `jobsmato_password`

### 3. **Redis Cache** (`redis`)
- **Port**: 6379
- **Purpose**: Caching and job queues

### 4. **Nginx Reverse Proxy** (`nginx`)
- **Port**: 80 (HTTP), 443 (HTTPS)
- **Features**: Rate limiting, SSL termination, load balancing

## 📋 Available Commands

### Setup & Start
```bash
# Development
./setup.sh dev

# Production
./setup.sh

# Manual start
docker-compose up -d
docker-compose -f docker-compose.dev.yml up -d
```

### Management
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild and start
docker-compose up --build -d

# Clean up (removes volumes)
docker-compose down -v
```

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View development logs
docker-compose -f docker-compose.dev.yml logs -f api

# Execute commands in container
docker-compose exec api npm run build
docker-compose exec api npm test
```

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### API Documentation
```bash
# Open in browser
open http://localhost:5000/api/docs
```

### Test Registration
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "job_seeker"
  }'
```

### Test Job Search
```bash
curl "http://localhost:5000/jobs?search=developer&location=remote"
```

## 🔒 Security Features

### Nginx Security Headers
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Content-Security-Policy

### Rate Limiting
- API: 10 requests/second
- Auth: 5 requests/second
- Burst: 20 requests

### Database Security
- Non-root user
- Encrypted connections
- Connection pooling

## 📊 Monitoring

### Health Checks
```bash
# API health
curl http://localhost:5000/health

# Database health
docker-compose exec postgres pg_isready -U jobsmato_user -d jobsmato_db

# Redis health
docker-compose exec redis redis-cli ping
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🗄️ Data Persistence

### Volumes
- `postgres_data` - Database data
- `redis_data` - Redis data
- `app` - Application code (development only)

### Backup
```bash
# Backup database
docker-compose exec postgres pg_dump -U jobsmato_user jobsmato_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U jobsmato_user jobsmato_db < backup.sql
```

## 🔧 Environment Variables

### Production (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://jobsmato_user:jobsmato_password@postgres:5432/jobsmato_db
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
REDIS_HOST=redis
REDIS_PORT=6379
```

### Development
- Hot reload enabled
- Debug logging
- Source code mounted
- Development database

## 🚀 Deployment

### Production Deployment
1. Update environment variables
2. Configure SSL certificates
3. Set up domain name
4. Run: `./setup.sh`

### Scaling
```bash
# Scale API instances
docker-compose up --scale api=3 -d

# Add load balancer
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

## 🧹 Cleanup

### Free Up Space
```bash
# Remove containers and volumes
docker-compose down -v

# Remove images
docker rmi jobsmato_backend_api

# Clean up everything
docker system prune -a
```

### Local Cleanup
```bash
# Run cleanup script
./cleanup.sh
```

## 📈 Performance

### Optimizations
- Multi-stage Docker builds
- Alpine Linux base images
- Nginx reverse proxy
- Redis caching
- Connection pooling
- Health checks

### Resource Usage
- **API**: ~100MB RAM
- **PostgreSQL**: ~200MB RAM
- **Redis**: ~50MB RAM
- **Nginx**: ~20MB RAM
- **Total**: ~370MB RAM

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :5000
lsof -i :5432
lsof -i :6379

# Kill the process
kill -9 <PID>
```

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### API Not Responding
```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

### Debug Mode
```bash
# Start with debug logs
DEBUG=* docker-compose up

# Access container shell
docker-compose exec api sh
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Documentation](https://nestjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

**🎉 Your Jobsmato Backend is now fully containerized and ready for production!**
