# 📝 Changelog

All notable changes to the Jobsmato Backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-09-25

### 🚀 Major Infrastructure Improvements

#### Added
- **SSL/HTTPS Support**: Implemented Nginx reverse proxy with SSL termination
- **Mixed Content Policy Resolution**: Fixed HTTPS frontend to HTTP backend communication issues
- **Enhanced CORS Configuration**: Added support for Vercel frontend and local development
- **Email Service Integration**: Complete SMTP setup with Gmail for password reset functionality
- **Google Drive File Upload**: OAuth 2.0 integration for secure file storage
- **Production Deployment Scripts**: Automated deployment to AWS EC2
- **Infrastructure Documentation**: Comprehensive deployment and troubleshooting guides

#### Changed
- **CORS Origins**: Added `https://jobsmato-frontend.vercel.app` and `https://15.134.85.184`
- **API Endpoints**: Now available on both HTTP (`http://15.134.85.184:5004/api`) and HTTPS (`https://15.134.85.184/api`)
- **Environment Configuration**: Enhanced with SMTP, Google Drive, and Redis settings
- **Docker Configuration**: Updated for production deployment with proper networking

#### Fixed
- **Mixed Content Security Policy**: Resolved browser blocking of HTTP requests from HTTPS pages
- **CORS Preflight Requests**: Proper handling of OPTIONS requests
- **Database Connection Issues**: Fixed container networking problems
- **File Upload Permissions**: Resolved Docker container file system permissions
- **Email Service**: Fixed Nodemailer configuration and SMTP authentication

#### Security
- **SSL/TLS Encryption**: All API traffic now encrypted
- **Secure Headers**: Enhanced security headers via Nginx
- **CORS Security**: Proper cross-origin request handling
- **Email Security**: Secure SMTP authentication with app passwords

### 🔧 Technical Details

#### New Files Added
- `src/entities/password-reset-token.entity.ts` - Password reset token management
- `src/modules/email/email.module.ts` - Email service module
- `src/modules/email/email.service.ts` - SMTP email service implementation
- `deploy-with-compose.sh` - Docker Compose deployment script
- `DEPLOYMENT-GUIDE.md` - Comprehensive deployment documentation
- `CHANGELOG.md` - This changelog file

#### Files Modified
- `src/main.ts` - Enhanced CORS configuration
- `src/modules/auth/auth.module.ts` - Added email service integration
- `src/modules/auth/auth.controller.ts` - Added password reset endpoints
- `src/modules/auth/auth.service.ts` - Implemented password reset logic
- `src/modules/auth/dto/auth.dto.ts` - Added password reset DTOs
- `docker-compose.yml` - Updated environment variables
- `deploy-to-ec2.sh` - Enhanced deployment script
- `README.md` - Updated with new features and deployment info

#### Infrastructure Changes
- **Nginx Configuration**: Added reverse proxy with SSL termination
- **SSL Certificates**: Self-signed certificates for HTTPS
- **Docker Networking**: Proper container networking setup
- **Environment Variables**: Comprehensive configuration management

### 🌐 API Changes

#### New Endpoints
- `POST /auth/forgot-password` - Request password reset via email
- `POST /auth/reset-password` - Reset password with secure token

#### Enhanced Endpoints
- All endpoints now support both HTTP and HTTPS
- Improved CORS headers for better frontend integration
- Enhanced error handling and validation

### 📊 Performance Improvements
- **SSL Termination**: Offloaded SSL processing to Nginx
- **Container Optimization**: Improved Docker image build process
- **Network Efficiency**: Optimized container networking
- **Caching**: Redis integration for improved performance

### 🔍 Monitoring & Logging
- **Enhanced Logging**: Improved request logging with Morgan
- **Health Checks**: Better application health monitoring
- **Error Tracking**: Enhanced error logging and debugging
- **Service Monitoring**: Docker container health monitoring

## [1.1.0] - 2025-09-24

### Added
- **Job Application System**: Complete job application workflow
- **User Profile Management**: Enhanced user profile features
- **Company Management**: Company profile and job posting system
- **File Upload Service**: Google Drive integration for resume uploads
- **Database Schema**: Complete entity relationships and migrations

### Changed
- **Authentication System**: Enhanced JWT authentication
- **API Structure**: Improved RESTful API design
- **Database Configuration**: Optimized TypeORM setup

### Fixed
- **Validation Issues**: Fixed DTO validation problems
- **Database Relations**: Resolved entity relationship issues
- **Error Handling**: Improved error responses

## [1.0.0] - 2025-09-23

### Added
- **Initial Release**: Core NestJS backend structure
- **Authentication System**: JWT-based authentication
- **Database Integration**: PostgreSQL with TypeORM
- **API Documentation**: Swagger/OpenAPI documentation
- **Basic CRUD Operations**: User, Job, Company management
- **Security Features**: Helmet, CORS, Rate limiting
- **Docker Support**: Containerization with Docker

### Technical Stack
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker and Docker Compose
- **Security**: Helmet, CORS, Rate limiting

---

## 🔮 Roadmap

### Version 1.3.0 (Planned)
- [ ] Let's Encrypt SSL certificates
- [ ] Domain name configuration
- [ ] Advanced monitoring and alerting
- [ ] Database backup automation
- [ ] Performance optimization

### Version 1.4.0 (Planned)
- [ ] Blog and content management system
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Microservices architecture
- [ ] API rate limiting improvements

### Version 2.0.0 (Future)
- [ ] Complete microservices migration
- [ ] Advanced caching strategies
- [ ] Real-time features with WebSockets
- [ ] Advanced search and filtering
- [ ] Multi-tenant architecture

---

## 📞 Support

For questions about these changes or deployment issues:
- Check the [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- Review the [README.md](./README.md)
- Contact the development team

---

**Last Updated:** September 25, 2025  
**Next Review:** October 1, 2025
