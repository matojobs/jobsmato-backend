# 🔄 Admin Backend Migration Guide

## 🎯 **Overview**
This guide provides step-by-step instructions for migrating the existing Jobsmato backend to include admin functionality. The migration is designed to be backward-compatible and non-disruptive.

## 📋 **Migration Steps**

### **Step 1: Database Migrations**

Run the migrations in the following order:

```bash
# 1. Add admin fields to users table
npm run migration:run -- 1700000000005-AddAdminFieldsToUsers

# 2. Add admin fields to jobs table  
npm run migration:run -- 1700000000006-AddAdminFieldsToJobs

# 3. Add admin fields to companies table
npm run migration:run -- 1700000000007-AddAdminFieldsToCompanies

# 4. Create new admin tables
npm run migration:run -- 1700000000008-CreateAdminTables
```

### **Step 2: Update Existing Data**

After running migrations, update existing data with default values:

```sql
-- Update existing users with default admin values
UPDATE users SET 
  is_active = true,
  is_verified = false,
  login_count = 0
WHERE is_active IS NULL;

-- Update existing jobs with default admin status
UPDATE jobs SET 
  admin_status = 'approved'
WHERE admin_status IS NULL;

-- Update existing companies with default admin status
UPDATE companies SET 
  admin_status = 'pending',
  admin_verified = false
WHERE admin_status IS NULL;
```

### **Step 3: Create Admin User**

Create the first admin user:

```sql
-- Insert admin user (replace with actual values)
INSERT INTO users (
  email, 
  password, 
  first_name, 
  last_name, 
  role, 
  status, 
  is_active, 
  is_verified,
  email_verified
) VALUES (
  'admin@jobsmato.com',
  '$2b$10$hashedpassword', -- Replace with actual hashed password
  'Admin',
  'User',
  'admin',
  'active',
  true,
  true,
  true
);
```

### **Step 4: Verify Installation**

1. **Start the application:**
   ```bash
   npm run start:dev
   ```

2. **Test admin endpoints:**
   ```bash
   # Test admin login
   curl -X POST http://localhost:3000/api/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@jobsmato.com", "password": "yourpassword"}'

   # Test dashboard stats
   curl -X GET http://localhost:3000/api/admin/dashboard/stats \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Check database tables:**
   ```sql
   -- Verify new tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('admin_actions_log', 'bulk_uploads', 'system_settings');

   -- Verify new columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name IN ('last_login_at', 'is_active', 'is_verified');
   ```

## 🔧 **Configuration**

### **Environment Variables**

Add these to your `.env` file:

```env
# Admin Configuration
ADMIN_RATE_LIMIT_WINDOW_MS=900000
ADMIN_RATE_LIMIT_MAX=100
ADMIN_AUDIT_ENABLED=true
ADMIN_AUDIT_RETENTION_DAYS=90
ADMIN_BULK_UPLOAD_MAX_SIZE=10485760
ADMIN_BULK_UPLOAD_MAX_RECORDS=1000
```

### **Rate Limiting Configuration**

Update your rate limiting configuration in `app.module.ts`:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
  {
    name: 'admin',
    ttl: 900000, // 15 minutes
    limit: 100, // 100 admin requests per 15 minutes
  },
]),
```

## 🧪 **Testing**

### **Unit Tests**

Run the test suite to ensure everything works:

```bash
# Run all tests
npm run test

# Run admin-specific tests
npm run test -- --testPathPattern=admin

# Run with coverage
npm run test:cov
```

### **Integration Tests**

Test the admin endpoints:

```bash
# Test admin authentication
npm run test:e2e -- --testNamePattern="Admin Auth"

# Test admin dashboard
npm run test:e2e -- --testNamePattern="Admin Dashboard"

# Test admin user management
npm run test:e2e -- --testNamePattern="Admin Users"
```

## 🚀 **Deployment**

### **Production Deployment**

1. **Run migrations in production:**
   ```bash
   NODE_ENV=production npm run migration:run
   ```

2. **Update environment variables:**
   ```bash
   # Set production admin configuration
   export ADMIN_RATE_LIMIT_WINDOW_MS=900000
   export ADMIN_RATE_LIMIT_MAX=50
   export ADMIN_AUDIT_ENABLED=true
   export ADMIN_AUDIT_RETENTION_DAYS=365
   ```

3. **Create production admin user:**
   ```bash
   # Use your application's user creation endpoint
   curl -X POST https://your-api.com/api/admin/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@yourcompany.com", "password": "securepassword", "role": "admin"}'
   ```

### **Docker Deployment**

Update your `Dockerfile` if needed:

```dockerfile
# Add admin-specific environment variables
ENV ADMIN_RATE_LIMIT_WINDOW_MS=900000
ENV ADMIN_RATE_LIMIT_MAX=100
ENV ADMIN_AUDIT_ENABLED=true
```

## 🔍 **Monitoring**

### **Health Checks**

Add admin-specific health checks:

```typescript
@Get('admin/health')
async getAdminHealth() {
  return {
    status: 'ok',
    admin: {
      tables: await this.checkAdminTables(),
      permissions: await this.checkAdminPermissions(),
      audit: await this.checkAuditLogging(),
    },
  };
}
```

### **Logging**

Monitor admin activities:

```bash
# Check admin action logs
SELECT 
  action_type,
  target_type,
  COUNT(*) as count,
  DATE(created_at) as date
FROM admin_actions_log 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action_type, target_type, DATE(created_at)
ORDER BY date DESC, count DESC;
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Migration fails:**
   ```bash
   # Check migration status
   npm run migration:show
   
   # Rollback if needed
   npm run migration:revert
   ```

2. **Admin endpoints return 403:**
   - Verify user has admin role
   - Check JWT token is valid
   - Ensure user is active

3. **Database connection issues:**
   ```bash
   # Check database connection
   npm run typeorm:cli -- query "SELECT 1"
   ```

### **Rollback Plan**

If you need to rollback:

1. **Stop the application:**
   ```bash
   pm2 stop jobsmato-backend
   ```

2. **Rollback migrations:**
   ```bash
   npm run migration:revert -- 1700000000008-CreateAdminTables
   npm run migration:revert -- 1700000000007-AddAdminFieldsToCompanies
   npm run migration:revert -- 1700000000006-AddAdminFieldsToJobs
   npm run migration:revert -- 1700000000005-AddAdminFieldsToUsers
   ```

3. **Remove admin module from app.module.ts:**
   ```typescript
   // Comment out or remove AdminModule import and usage
   ```

## 📊 **Performance Considerations**

### **Database Optimization**

1. **Monitor query performance:**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   WHERE query LIKE '%admin%' 
   ORDER BY mean_time DESC;
   ```

2. **Add indexes if needed:**
   ```sql
   -- Add additional indexes based on usage patterns
   CREATE INDEX idx_admin_actions_admin_created ON admin_actions_log(admin_id, created_at);
   CREATE INDEX idx_users_role_active ON users(role, is_active);
   ```

### **Caching Strategy**

Implement caching for frequently accessed admin data:

```typescript
// Cache dashboard stats for 5 minutes
@Cacheable('admin:dashboard:stats', 300)
async getDashboardStats() {
  // Implementation
}
```

## 🔒 **Security Checklist**

- [ ] Admin endpoints are properly protected
- [ ] Rate limiting is configured
- [ ] Audit logging is enabled
- [ ] Admin users have strong passwords
- [ ] JWT tokens have appropriate expiration
- [ ] Database connections use SSL
- [ ] Admin actions are logged with IP addresses
- [ ] Sensitive data is not exposed in logs

## 📈 **Success Metrics**

After migration, monitor these metrics:

- **API Response Time**: < 200ms for admin endpoints
- **Database Query Time**: < 100ms for dashboard queries
- **Error Rate**: < 1% for admin operations
- **Uptime**: > 99.9% for admin functionality

## 🎯 **Next Steps**

After successful migration:

1. **Train admin users** on the new functionality
2. **Set up monitoring** for admin operations
3. **Configure alerts** for critical admin actions
4. **Plan regular backups** of admin data
5. **Schedule maintenance windows** for admin updates

This migration guide ensures a smooth transition to the admin backend functionality while maintaining system stability and performance.
