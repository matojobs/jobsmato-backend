# 🚀 Jobsmato Backend - Quick Start Guide

## ✅ **What's Ready**

Your complete NestJS backend is ready with:
- ✅ **Full API** - Authentication, Jobs, Applications, Users
- ✅ **Docker Setup** - Complete containerization
- ✅ **Database Schema** - PostgreSQL with all entities
- ✅ **Security** - JWT, rate limiting, validation
- ✅ **Documentation** - Swagger API docs
- ✅ **Production Ready** - Nginx, Redis, monitoring

## 🐳 **Docker Setup (Recommended)**

### 1. Start Docker Desktop
```bash
# Make sure Docker Desktop is running
open -a Docker
```

### 2. Start the Backend
```bash
# Development (with hot reload)
./setup.sh dev

# Production
./setup.sh
```

### 3. Test the API
```bash
# Health check
curl http://localhost:5000/health

# API documentation
open http://localhost:5000/api/docs
```

## 🏃‍♂️ **Local Development (Alternative)**

If you prefer local development:

### 1. Install PostgreSQL
```bash
brew install postgresql
brew services start postgresql
createdb jobsmato_db
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm run start:dev
```

## 📋 **Available Endpoints**

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - User profile

### Jobs
- `GET /jobs` - Search jobs
- `POST /jobs` - Create job (Employers)
- `GET /jobs/featured` - Featured jobs
- `GET /jobs/hot` - Urgent jobs

### Applications
- `POST /applications` - Apply for job
- `GET /applications` - User applications
- `PATCH /applications/:id/status` - Update status

### Users
- `GET /users/profile` - User profile
- `PATCH /users/profile` - Update profile

## 🧪 **Test the API**

### Register a User
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

### Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Search Jobs
```bash
curl "http://localhost:5000/jobs?search=developer&location=remote"
```

## 🔧 **Management Commands**

### Docker Commands
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Clean up
./cleanup.sh
```

### Local Commands
```bash
# Build
npm run build

# Test
npm run test

# Lint
npm run lint
```

## 📊 **Project Structure**

```
jobsmato_backend/
├── src/
│   ├── entities/          # Database entities
│   ├── modules/           # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── jobs/         # Job management
│   │   ├── users/        # User management
│   │   └── applications/ # Job applications
│   ├── common/           # Shared utilities
│   └── config/           # Configuration
├── docker-compose.yml    # Production services
├── docker-compose.dev.yml # Development services
├── Dockerfile            # Production build
├── Dockerfile.dev        # Development build
├── setup.sh             # Setup script
├── cleanup.sh           # Cleanup script
└── README-Docker.md     # Docker documentation
```

## 🎯 **Next Steps**

1. **Start Docker Desktop**
2. **Run `./setup.sh dev`**
3. **Test the API endpoints**
4. **Connect your frontend**
5. **Deploy to production**

## 🆘 **Troubleshooting**

### Docker Issues
```bash
# Check Docker status
docker --version
docker-compose --version

# Restart Docker
sudo systemctl restart docker
# or
open -a Docker
```

### Port Conflicts
```bash
# Check what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Database Issues
```bash
# Check PostgreSQL
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql
```

## 🎉 **You're All Set!**

Your Jobsmato backend is ready to power your entire job portal ecosystem. The Docker setup makes it easy to deploy and scale across different environments.

**Happy coding! 🚀**
