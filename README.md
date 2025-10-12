# 🚀 Jobsmato Backend API

A comprehensive NestJS backend for the Jobsmato job portal platform, built with enterprise-grade architecture and scalability in mind.

## 🏗️ Architecture Overview

This backend is designed to support multiple products in the Jobsmato ecosystem:
- **Jobsmato Website** - Job board platform
- **HRMS** - Human Resource Management System
- **Resume Builder** - Document generation
- **Future Products** - Scalable microservices architecture

## 🛠️ Tech Stack

### Core Framework
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **TypeORM** - Object-Relational Mapping
- **PostgreSQL** - Primary database

### Authentication & Security
- **JWT** - JSON Web Tokens for authentication
- **Passport** - Authentication strategies
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - API protection

### Additional Features
- **Swagger** - API documentation
- **Class Validator** - DTO validation
- **Class Transformer** - Data transformation
- **Throttler** - Rate limiting
- **Event Emitter** - Event-driven architecture
- **Schedule** - Cron jobs and tasks
- **Nodemailer** - Email service for notifications and password reset
- **Google Drive Integration** - File upload service
- **Redis** - Caching and session management
- **Nginx** - Reverse proxy with SSL termination

## 📁 Project Structure

```
src/
├── entities/                 # Database entities
│   ├── user.entity.ts
│   ├── company.entity.ts
│   ├── job.entity.ts
│   ├── job-application.entity.ts
│   ├── job-seeker-profile.entity.ts
│   ├── saved-job.entity.ts
│   ├── job-alert.entity.ts
│   ├── notification.entity.ts
│   ├── blog-post.entity.ts
│   ├── blog-comment.entity.ts
│   ├── company-review.entity.ts
│   └── contact-message.entity.ts
├── modules/                  # Feature modules
│   ├── auth/                # Authentication
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/               # User management
│   ├── jobs/                # Job management
│   ├── applications/        # Job applications
│   ├── companies/           # Company management
│   ├── blog/               # Content management
│   ├── notifications/      # Notification system
│   ├── upload/             # File uploads (Google Drive integration)
│   └── email/              # Email service (SMTP with Nodemailer)
├── common/                  # Shared utilities
│   ├── decorators/
│   ├── guards/
│   ├── pipes/
│   ├── interceptors/
│   └── filters/
├── config/                  # Configuration
│   └── database.config.ts
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jobsmato_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/jobsmato_db"
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=password
   DB_NAME=jobsmato_db

   # JWT
   JWT_SECRET="your-super-secret-jwt-key-here"
   JWT_EXPIRES_IN="7d"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"
   JWT_REFRESH_EXPIRES_IN="30d"

   # Server
   PORT=5000
   NODE_ENV="development"
   FRONTEND_URL="http://localhost:3000"

   # Email (SMTP)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="noreply@jobsmato.com"

   # Google Drive (OAuth)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GOOGLE_REDIRECT_URI="your-redirect-uri"
   GOOGLE_DRIVE_FOLDER_ID="your-folder-id"

   # Redis
   REDIS_HOST="localhost"
   REDIS_PORT=6379
   REDIS_PASSWORD=""
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb jobsmato_db
   
   # Run migrations (when available)
   npm run migration:run
   ```

5. **Start the application**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:5000/api/docs`
- **API Base URL**: `http://localhost:5000/api`

### Production Endpoints
- **HTTPS API**: `https://api.jobsmato.com/api` (Recommended - Valid SSL)
- **HTTP API**: `http://15.134.85.184:5004/api` (Fallback)
- **Swagger Docs**: `https://api.jobsmato.com/api/docs`

## 🔐 Authentication

The API uses JWT-based authentication with the following endpoints:

### Public Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Password reset request (sends email)
- `POST /auth/reset-password` - Password reset with token

### Protected Endpoints
- `GET /auth/profile` - Get user profile
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password

## 📋 API Endpoints

### Authentication (`/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh` - Refresh token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /change-password` - Change password
- `GET /profile` - Get user profile

### Users (`/users`)
- `GET /profile` - Get current user profile
- `PATCH /profile` - Update user profile
- `GET /job-seeker-profile` - Get job seeker profile
- `PATCH /job-seeker-profile` - Update job seeker profile
- `GET /:id` - Get user by ID

### Jobs (`/jobs`)
- `POST /` - Create job posting (Employers only)
- `GET /` - Search and filter jobs
- `GET /featured` - Get featured jobs
- `GET /hot` - Get hot/urgent jobs
- `GET /categories` - Get job categories
- `GET /company/:companyId` - Get jobs by company
- `GET /:id` - Get job by ID
- `PATCH /:id` - Update job posting (Employers only)
- `DELETE /:id` - Delete job posting (Employers only)

### Applications (`/applications`)
- `POST /` - Apply for job (Job Seekers only)
- `GET /` - Get user applications
- `GET /job/:jobId` - Get applications for job (Employers only)
- `GET /:id` - Get application by ID
- `PATCH /:id/status` - Update application status (Employers only)
- `DELETE /:id` - Withdraw application (Job Seekers only)

## 🗄️ Database Schema

### Core Entities

#### User
- Basic user information
- Role-based access (Job Seeker, Employer, Admin)
- Profile management

#### Company
- Company information
- Verification status
- Job postings

#### Job
- Job postings with full details
- Search and filtering capabilities
- Application tracking

#### Job Application
- Application management
- Status tracking
- Resume and cover letter storage

#### Job Seeker Profile
- Skills and experience
- Resume management
- Job preferences

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-based Access Control** - Granular permissions
- **Password Hashing** - bcryptjs for secure storage
- **Rate Limiting** - API protection
- **CORS Configuration** - Cross-origin security
- **Helmet** - Security headers
- **Input Validation** - DTO validation
- **SSL/TLS Encryption** - HTTPS with Nginx reverse proxy
- **Mixed Content Policy** - Resolved for secure frontend-backend communication
- **Email Security** - SMTP with secure authentication

## 🚀 Deployment

### AWS EC2 Deployment (Production)

The backend is deployed on AWS EC2 with the following infrastructure:

#### Production Setup
- **Server**: AWS EC2 (15.134.85.184)
- **SSL**: Nginx reverse proxy with self-signed certificate
- **Database**: PostgreSQL with Docker
- **Cache**: Redis with Docker
- **File Storage**: Google Drive integration

#### Deployment Scripts

**Quick Deployment:**
```bash
# Deploy with Docker Compose (Recommended)
./deploy-with-compose.sh

# Deploy with manual Docker run
./deploy-to-ec2.sh
```

**Manual Deployment:**
```bash
# Build and upload image
docker build --platform linux/amd64 -t jobsmato-backend:latest .
docker save jobsmato-backend:latest | gzip > jobsmato-backend.tar.gz
scp -i jobsmato_backend.pem jobsmato-backend.tar.gz ec2-user@15.134.85.184:/home/ec2-user/

# SSH and deploy
ssh -i jobsmato_backend.pem ec2-user@15.134.85.184
docker load < jobsmato-backend.tar.gz
docker run -d --name jobsmato-backend -p 5004:5000 jobsmato-backend:latest
```

### Local Development

#### Docker (Recommended)
```bash
# Build image
docker build -t jobsmato-backend .

# Run with docker-compose
docker-compose up -d

# Run standalone
docker run -p 5000:5000 --env-file .env jobsmato-backend
```

#### Manual Deployment
```bash
# Build application
npm run build

# Start production server
npm run start:prod
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📈 Monitoring & Logging

- **Morgan** - HTTP request logging
- **Event Emitter** - Application events
- **Schedule** - Background tasks
- **Health Checks** - Application monitoring

## 🔧 Infrastructure & Troubleshooting

### Recent Improvements (Latest Update)

#### Mixed Content Security Policy Resolution
- **Problem**: Frontend (HTTPS) couldn't communicate with backend (HTTP)
- **Solution**: Implemented Nginx reverse proxy with SSL termination
- **Result**: Both frontend and backend now use HTTPS

#### CORS Configuration Enhancement
- **Added**: Support for all origins (`origin: true`)
- **Added**: Universal cross-origin access for any domain
- **Added**: Proper preflight request handling
- **Added**: Flexible frontend integration

#### Email Service Integration
- **SMTP Configuration**: Gmail SMTP with app passwords
- **Password Reset**: Secure token-based password recovery
- **Email Templates**: HTML email templates for notifications

#### File Upload Service
- **Google Drive Integration**: OAuth 2.0 authentication
- **Secure Storage**: Files stored in dedicated Google Drive folder
- **Resume Upload**: Job application resume storage

### Production Infrastructure

#### Server Configuration
- **OS**: Amazon Linux 2023
- **Web Server**: Nginx 1.28.0
- **SSL**: Let's Encrypt certificate (Valid SSL)
- **Domain**: api.jobsmato.com
- **Container Runtime**: Docker with Docker Compose

#### Network Configuration
- **Domain**: api.jobsmato.com
- **Public IP**: 15.134.85.184
- **HTTPS Port**: 443 (Nginx with Let's Encrypt SSL)
- **HTTP Port**: 80 (redirects to HTTPS)
- **Backend Port**: 5004 (internal Docker network)

#### Service Management
```bash
# Check service status
sudo systemctl status nginx
docker ps

# View logs
sudo journalctl -u nginx -f
docker logs jobsmato_api

# Restart services
sudo systemctl restart nginx
docker restart jobsmato_api
```

### Common Issues & Solutions

#### CORS Errors
- **Symptom**: "Provisional headers are shown" in browser
- **Cause**: Mixed content policy (HTTPS → HTTP)
- **Solution**: Use HTTPS endpoint: `https://api.jobsmato.com/api`

#### Database Connection Issues
- **Symptom**: `ECONNREFUSED` or `ENOTFOUND postgres`
- **Cause**: Container networking issues
- **Solution**: Ensure containers are on same Docker network

#### SSL Certificate Warnings
- **Symptom**: Browser shows "Not Secure" warning
- **Cause**: Self-signed certificate
- **Solution**: Use the valid SSL endpoint: `https://api.jobsmato.com/api`

## 🔧 Development

### Code Style
- ESLint for code linting
- Prettier for code formatting
- TypeScript strict mode

### Git Hooks
- Pre-commit hooks for code quality
- Automated testing on push

## 🌟 Features

### Current Features
- ✅ User authentication and authorization
- ✅ Job posting and management
- ✅ Job search and filtering
- ✅ Job applications
- ✅ User profile management
- ✅ Company management
- ✅ API documentation
- ✅ Input validation
- ✅ Error handling
- ✅ **Password reset via email** (SMTP integration)
- ✅ **File upload to Google Drive** (OAuth integration)
- ✅ **SSL/HTTPS support** (Nginx reverse proxy)
- ✅ **Universal CORS configuration** for any frontend domain
- ✅ **Mixed Content Policy resolution**
- ✅ **Production deployment** on AWS EC2

### Planned Features
- 🔄 Blog and content management
- 🔄 Notification system
- 🔄 Advanced analytics
- 🔄 Real-time features
- 🔄 Microservices architecture
- 🔄 Let's Encrypt SSL certificates
- 🔄 Domain name configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

---

**Built with ❤️ using NestJS for the Jobsmato ecosystem**