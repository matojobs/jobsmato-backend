# 🔧 Admin Backend Implementation Plan

## 🎯 **Overview**
This document outlines the comprehensive implementation plan for adding admin functionality to the Jobsmato backend. The implementation will be done incrementally to ensure system stability and minimal disruption to existing functionality.

## 📊 **Current System Analysis**

### **Existing Architecture**
- **Framework**: NestJS with TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT-based with role-based access control
- **Current Roles**: `JOB_SEEKER`, `EMPLOYER`, `ADMIN` (already exists)
- **Modules**: Auth, Users, Jobs, Companies, Applications, Upload

### **Current User Entity Analysis**
```typescript
// Current User entity already has:
- role: UserRole (includes ADMIN)
- status: UserStatus (ACTIVE, INACTIVE, SUSPENDED, PENDING_VERIFICATION)
- emailVerified: boolean
- onboardingComplete: boolean
```

### **Current Job Entity Analysis**
```typescript
// Current Job entity has:
- status: JobStatus (DRAFT, ACTIVE, PAUSED, CLOSED)
- isFeatured: boolean
- views: number
- applicationsCount: number
```

### **Current Company Entity Analysis**
```typescript
// Current Company entity has:
- isVerified: boolean
- Basic company information fields
```

## 🏗️ **Implementation Strategy**

### **Phase 1: Database Schema Enhancement (Week 1)**
1. **Add Admin Fields to Existing Tables**
2. **Create New Admin-Specific Tables**
3. **Add Performance Indexes**
4. **Create Database Migrations**

### **Phase 2: Core Admin Module (Week 2)**
1. **Admin Authentication & Authorization**
2. **Dashboard Analytics APIs**
3. **User Management APIs**
4. **Basic Activity Logging**

### **Phase 3: Advanced Features (Week 3)**
1. **Company Management APIs**
2. **Job Management APIs**
3. **Bulk Upload Functionality**
4. **System Settings Management**

### **Phase 4: Security & Performance (Week 4)**
1. **Enhanced Security Measures**
2. **Performance Optimizations**
3. **Comprehensive Testing**
4. **Documentation & Deployment**

## 📋 **Detailed Implementation Plan**

### **1. Database Schema Changes**

#### **A. User Table Enhancements**
```sql
-- Add admin-specific fields to users table
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN verification_expires_at TIMESTAMP;

-- Add performance indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_role_created_at ON users(role, created_at);
```

#### **B. Job Table Enhancements**
```sql
-- Add admin management fields
ALTER TABLE jobs ADD COLUMN admin_notes TEXT;
ALTER TABLE jobs ADD COLUMN admin_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE jobs ADD COLUMN admin_reviewed_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN admin_reviewed_by INTEGER REFERENCES users(id);

-- Add performance indexes
CREATE INDEX idx_jobs_admin_status ON jobs(admin_status);
CREATE INDEX idx_jobs_admin_reviewed_by ON jobs(admin_reviewed_by);
CREATE INDEX idx_jobs_created_at_status ON jobs(created_at, status);
```

#### **C. Company Table Enhancements**
```sql
-- Add admin management fields
ALTER TABLE companies ADD COLUMN admin_notes TEXT;
ALTER TABLE companies ADD COLUMN admin_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN admin_reviewed_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN admin_reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE companies ADD COLUMN admin_verified BOOLEAN DEFAULT false;

-- Add performance indexes
CREATE INDEX idx_companies_admin_status ON companies(admin_status);
CREATE INDEX idx_companies_admin_verified ON companies(admin_verified);
CREATE INDEX idx_companies_created_at_status ON companies(created_at, admin_status);
```

#### **D. New Admin Tables**

##### **Admin Actions Log**
```sql
CREATE TABLE admin_actions_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions_log(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions_log(action_type);
CREATE INDEX idx_admin_actions_created_at ON admin_actions_log(created_at);
CREATE INDEX idx_admin_actions_target ON admin_actions_log(target_type, target_id);
```

##### **Bulk Uploads**
```sql
CREATE TABLE bulk_uploads (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER,
  total_records INTEGER,
  successful_records INTEGER,
  failed_records INTEGER,
  status VARCHAR(20) DEFAULT 'processing',
  error_log JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_bulk_uploads_admin_id ON bulk_uploads(admin_id);
CREATE INDEX idx_bulk_uploads_status ON bulk_uploads(status);
CREATE INDEX idx_bulk_uploads_created_at ON bulk_uploads(created_at);
```

##### **System Settings**
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);
```

### **2. Entity Updates**

#### **A. Enhanced User Entity**
```typescript
// Add to existing User entity
@Column({ type: 'timestamp', nullable: true })
lastLoginAt: Date;

@Column({ default: 0 })
loginCount: number;

@Column({ default: true })
isActive: boolean;

@Column({ default: false })
isVerified: boolean;

@Column({ nullable: true })
verificationToken: string;

@Column({ type: 'timestamp', nullable: true })
verificationExpiresAt: Date;
```

#### **B. Enhanced Job Entity**
```typescript
// Add to existing Job entity
@Column({ type: 'text', nullable: true })
adminNotes: string;

@Column({ default: 'approved' })
adminStatus: string;

@Column({ type: 'timestamp', nullable: true })
adminReviewedAt: Date;

@Column({ nullable: true })
adminReviewedBy: number;

@ManyToOne('User', 'adminReviewedJobs')
@JoinColumn({ name: 'adminReviewedBy' })
adminReviewer: User;
```

#### **C. Enhanced Company Entity**
```typescript
// Add to existing Company entity
@Column({ type: 'text', nullable: true })
adminNotes: string;

@Column({ default: 'pending' })
adminStatus: string;

@Column({ type: 'timestamp', nullable: true })
adminReviewedAt: Date;

@Column({ nullable: true })
adminReviewedBy: number;

@Column({ default: false })
adminVerified: boolean;

@ManyToOne('User', 'adminReviewedCompanies')
@JoinColumn({ name: 'adminReviewedBy' })
adminReviewer: User;
```

#### **D. New Admin Entities**

##### **AdminActionLog Entity**
```typescript
@Entity('admin_actions_log')
export class AdminActionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number;

  @Column({ length: 50 })
  actionType: string;

  @Column({ length: 50 })
  targetType: string;

  @Column({ nullable: true })
  targetId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('User', 'adminActions')
  @JoinColumn({ name: 'adminId' })
  admin: User;
}
```

##### **BulkUpload Entity**
```typescript
@Entity('bulk_uploads')
export class BulkUpload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number;

  @Column({ length: 255 })
  filename: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  totalRecords: number;

  @Column({ nullable: true })
  successfulRecords: number;

  @Column({ nullable: true })
  failedRecords: number;

  @Column({ length: 20, default: 'processing' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  errorLog: any;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @ManyToOne('User', 'bulkUploads')
  @JoinColumn({ name: 'adminId' })
  admin: User;
}
```

##### **SystemSetting Entity**
```typescript
@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  settingKey: string;

  @Column({ type: 'text', nullable: true })
  settingValue: string;

  @Column({ length: 20, default: 'string' })
  settingType: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### **3. Admin Module Structure**

#### **A. Admin Module**
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Job,
      Company,
      AdminActionLog,
      BulkUpload,
      SystemSetting,
    ]),
    AuthModule,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminUsersController,
    AdminCompaniesController,
    AdminJobsController,
    AdminBulkUploadController,
    AdminSettingsController,
    AdminActivityController,
  ],
  providers: [
    AdminService,
    AdminDashboardService,
    AdminUsersService,
    AdminCompaniesService,
    AdminJobsService,
    AdminBulkUploadService,
    AdminSettingsService,
    AdminActivityService,
    AdminAuditService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
```

#### **B. Admin Controllers**

##### **AdminAuthController**
```typescript
@Controller('admin/auth')
export class AdminAuthController {
  @Post('login')
  async adminLogin(@Body() loginDto: AdminLoginDto) {
    // Admin-specific login with enhanced security
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getPermissions(@CurrentUser() user: User) {
    // Return admin permissions
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminLogout(@CurrentUser() user: User) {
    // Admin logout with audit logging
  }
}
```

##### **AdminDashboardController**
```typescript
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  @Get('stats')
  async getDashboardStats() {
    // Return comprehensive dashboard statistics
  }

  @Get('analytics/users')
  async getUserAnalytics(@Query() query: AnalyticsQueryDto) {
    // User analytics data
  }

  @Get('analytics/jobs')
  async getJobAnalytics(@Query() query: AnalyticsQueryDto) {
    // Job analytics data
  }

  @Get('analytics/applications')
  async getApplicationAnalytics(@Query() query: AnalyticsQueryDto) {
    // Application analytics data
  }
}
```

##### **AdminUsersController**
```typescript
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  @Get()
  async getUsers(@Query() query: GetUsersQueryDto) {
    // Get paginated users with filtering
  }

  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) id: number) {
    // Get specific user details
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() admin: User,
  ) {
    // Update user with audit logging
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
  ) {
    // Delete user with audit logging
  }

  @Post(':id/verify')
  async verifyUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
  ) {
    // Verify user account
  }

  @Post(':id/suspend')
  async suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() suspendDto: SuspendUserDto,
    @CurrentUser() admin: User,
  ) {
    // Suspend user account
  }
}
```

##### **AdminCompaniesController**
```typescript
@Controller('admin/companies')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCompaniesController {
  @Get()
  async getCompanies(@Query() query: GetCompaniesQueryDto) {
    // Get paginated companies with filtering
  }

  @Get(':id')
  async getCompany(@Param('id', ParseIntPipe) id: number) {
    // Get specific company details
  }

  @Put(':id/status')
  async updateCompanyStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: UpdateCompanyStatusDto,
    @CurrentUser() admin: User,
  ) {
    // Update company status with audit logging
  }

  @Post(':id/verify')
  async verifyCompany(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
  ) {
    // Verify company
  }
}
```

##### **AdminJobsController**
```typescript
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminJobsController {
  @Get()
  async getJobs(@Query() query: GetJobsQueryDto) {
    // Get paginated jobs with filtering
  }

  @Get(':id')
  async getJob(@Param('id', ParseIntPipe) id: number) {
    // Get specific job details
  }

  @Put(':id/status')
  async updateJobStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: UpdateJobStatusDto,
    @CurrentUser() admin: User,
  ) {
    // Update job status with audit logging
  }

  @Post('bulk-action')
  async bulkJobAction(
    @Body() bulkDto: BulkJobActionDto,
    @CurrentUser() admin: User,
  ) {
    // Perform bulk job operations
  }
}
```

##### **AdminBulkUploadController**
```typescript
@Controller('admin/jobs/bulk-upload')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBulkUploadController {
  @Post('validate')
  async validateBulkData(@Body() validateDto: BulkValidateDto) {
    // Validate bulk job data
  }

  @Post('upload')
  async processBulkUpload(
    @Body() uploadDto: BulkUploadDto,
    @CurrentUser() admin: User,
  ) {
    // Process bulk job upload
  }

  @Get('uploads/:id')
  async getUploadStatus(@Param('id') id: string) {
    // Get bulk upload status
  }

  @Get('uploads')
  async getUploadHistory(@Query() query: GetUploadsQueryDto) {
    // Get bulk upload history
  }
}
```

##### **AdminSettingsController**
```typescript
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSettingsController {
  @Get()
  async getSystemSettings() {
    // Get all system settings
  }

  @Put()
  async updateSystemSettings(
    @Body() settingsDto: UpdateSystemSettingsDto,
    @CurrentUser() admin: User,
  ) {
    // Update system settings with audit logging
  }
}
```

##### **AdminActivityController**
```typescript
@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminActivityController {
  @Get()
  async getActivityLogs(@Query() query: GetActivityLogsQueryDto) {
    // Get paginated activity logs
  }

  @Get('export')
  async exportActivityLogs(@Query() query: ExportActivityLogsQueryDto) {
    // Export activity logs
  }
}
```

### **4. Security Implementation**

#### **A. Admin Guards**
```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return user && user.role === UserRole.ADMIN;
  }
}

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredPermissions) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredPermissions.every(permission => 
      user.permissions?.includes(permission)
    );
  }
}
```

#### **B. Rate Limiting**
```typescript
// Admin-specific rate limiting
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each admin to 100 requests per windowMs
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain admin operations
    return req.path.includes('/admin/auth/login');
  },
});
```

#### **C. Audit Logging**
```typescript
@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminActionLog)
    private adminActionLogRepository: Repository<AdminActionLog>,
  ) {}

  async logAction(
    adminId: number,
    actionType: string,
    targetType: string,
    targetId: number | null,
    description: string,
    metadata: any,
    ipAddress: string,
    userAgent: string,
  ) {
    const log = this.adminActionLogRepository.create({
      adminId,
      actionType,
      targetType,
      targetId,
      description,
      metadata,
      ipAddress,
      userAgent,
    });
    
    return this.adminActionLogRepository.save(log);
  }
}
```

### **5. Performance Optimizations**

#### **A. Database Indexes**
```sql
-- Additional performance indexes
CREATE INDEX idx_users_role_created_at ON users(role, created_at);
CREATE INDEX idx_jobs_created_at_status ON jobs(created_at, status);
CREATE INDEX idx_companies_created_at_status ON companies(created_at, admin_status);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_admin_actions_created_at_type ON admin_actions_log(created_at, action_type);
```

#### **B. Caching Strategy**
```typescript
@Injectable()
export class AdminCacheService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async cacheDashboardStats(stats: DashboardStats) {
    await this.redis.setex('admin:dashboard:stats', 300, JSON.stringify(stats));
  }

  async getCachedDashboardStats(): Promise<DashboardStats | null> {
    const cached = await this.redis.get('admin:dashboard:stats');
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateCache(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### **C. Query Optimization**
```typescript
@Injectable()
export class AdminDashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      totalJobs,
      totalCompanies,
      totalApplications,
      activeJobs,
      newUsersToday,
      newJobsToday,
    ] = await Promise.all([
      this.userRepository.count(),
      this.jobRepository.count(),
      this.companyRepository.count(),
      this.applicationRepository.count(),
      this.jobRepository.count({ where: { status: JobStatus.ACTIVE } }),
      this.userRepository.count({
        where: {
          createdAt: MoreThanOrEqual(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      this.jobRepository.count({
        where: {
          createdAt: MoreThanOrEqual(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    return {
      totalUsers,
      totalJobs,
      totalCompanies,
      totalApplications,
      activeJobs,
      newUsersToday,
      newJobsToday,
      userGrowthRate: await this.calculateUserGrowthRate(),
      jobPostingRate: await this.calculateJobPostingRate(),
      applicationRate: await this.calculateApplicationRate(),
    };
  }
}
```

### **6. Migration Strategy**

#### **A. Database Migrations**
```typescript
// Migration: AddAdminFieldsToUsers
export class AddAdminFieldsToUsers1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'last_login_at',
      type: 'timestamp',
      isNullable: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'login_count',
      type: 'int',
      default: 0,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'is_active',
      type: 'boolean',
      default: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'is_verified',
      type: 'boolean',
      default: false,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'verification_token',
      type: 'varchar',
      length: '255',
      isNullable: true,
    }));

    await queryRunner.addColumn('users', new TableColumn({
      name: 'verification_expires_at',
      type: 'timestamp',
      isNullable: true,
    }));

    // Add indexes
    await queryRunner.createIndex('users', new Index('idx_users_role', ['role']));
    await queryRunner.createIndex('users', new Index('idx_users_is_active', ['is_active']));
    await queryRunner.createIndex('users', new Index('idx_users_created_at', ['created_at']));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'idx_users_created_at');
    await queryRunner.dropIndex('users', 'idx_users_is_active');
    await queryRunner.dropIndex('users', 'idx_users_role');
    
    await queryRunner.dropColumn('users', 'verification_expires_at');
    await queryRunner.dropColumn('users', 'verification_token');
    await queryRunner.dropColumn('users', 'is_verified');
    await queryRunner.dropColumn('users', 'is_active');
    await queryRunner.dropColumn('users', 'login_count');
    await queryRunner.dropColumn('users', 'last_login_at');
  }
}
```

#### **B. Data Migration**
```typescript
// Migration: CreateAdminTables
export class CreateAdminTables1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_actions_log table
    await queryRunner.createTable(new Table({
      name: 'admin_actions_log',
      columns: [
        {
          name: 'id',
          type: 'serial',
          isPrimary: true,
        },
        {
          name: 'admin_id',
          type: 'int',
        },
        {
          name: 'action_type',
          type: 'varchar',
          length: '50',
        },
        {
          name: 'target_type',
          type: 'varchar',
          length: '50',
        },
        {
          name: 'target_id',
          type: 'int',
          isNullable: true,
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
        },
        {
          name: 'ip_address',
          type: 'inet',
          isNullable: true,
        },
        {
          name: 'user_agent',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
      ],
    }), true);

    // Add foreign key constraint
    await queryRunner.createForeignKey('admin_actions_log', new ForeignKey({
      columnNames: ['admin_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'users',
      onDelete: 'CASCADE',
    }));

    // Create indexes
    await queryRunner.createIndex('admin_actions_log', new Index('idx_admin_actions_admin_id', ['admin_id']));
    await queryRunner.createIndex('admin_actions_log', new Index('idx_admin_actions_type', ['action_type']));
    await queryRunner.createIndex('admin_actions_log', new Index('idx_admin_actions_created_at', ['created_at']));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_actions_log');
  }
}
```

### **7. Testing Strategy**

#### **A. Unit Tests**
```typescript
describe('AdminService', () => {
  let service: AdminService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        totalJobs: 50,
        totalCompanies: 25,
        totalApplications: 200,
        activeJobs: 45,
        newUsersToday: 5,
        newJobsToday: 3,
      };

      jest.spyOn(userRepository, 'count').mockResolvedValue(100);
      // ... other mocks

      const result = await service.getDashboardStats();
      expect(result).toEqual(mockStats);
    });
  });
});
```

#### **B. Integration Tests**
```typescript
describe('AdminController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create admin user and get token
    adminToken = await createAdminUserAndGetToken();
  });

  describe('/admin/dashboard/stats (GET)', () => {
    it('should return dashboard statistics', () => {
      return request(app.getHttpServer())
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalUsers');
          expect(res.body).toHaveProperty('totalJobs');
          expect(res.body).toHaveProperty('totalCompanies');
        });
    });
  });
});
```

### **8. Deployment Strategy**

#### **A. Environment Configuration**
```typescript
// Admin-specific environment variables
export const adminConfig = {
  rateLimit: {
    windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.ADMIN_RATE_LIMIT_MAX || '100'),
  },
  audit: {
    enabled: process.env.ADMIN_AUDIT_ENABLED === 'true',
    retentionDays: parseInt(process.env.ADMIN_AUDIT_RETENTION_DAYS || '90'),
  },
  bulkUpload: {
    maxFileSize: parseInt(process.env.ADMIN_BULK_UPLOAD_MAX_SIZE || '10485760'), // 10MB
    maxRecords: parseInt(process.env.ADMIN_BULK_UPLOAD_MAX_RECORDS || '1000'),
  },
};
```

#### **B. Health Checks**
```typescript
@Controller('admin/health')
export class AdminHealthController {
  @Get()
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        email: await this.checkEmail(),
      },
    };
  }
}
```

## 🎯 **Success Metrics**

### **Performance Targets**
- **API Response Time**: < 200ms for admin endpoints
- **Database Query Time**: < 100ms for dashboard queries
- **Bulk Upload Processing**: < 2 minutes for 1000 jobs
- **System Uptime**: > 99.9% availability

### **Security Targets**
- **Zero Security Breaches**: No unauthorized admin access
- **Audit Coverage**: 100% admin action logging
- **Permission Validation**: 100% permission checks
- **Rate Limiting**: Effective abuse prevention

### **Quality Targets**
- **Test Coverage**: > 90% for admin modules
- **Code Quality**: ESLint/Prettier compliance
- **Documentation**: Complete API documentation
- **Performance**: No memory leaks or performance degradation

## 📅 **Implementation Timeline**

### **Week 1: Database & Core Setup**
- [ ] Database schema changes and migrations
- [ ] Entity updates and new entities
- [ ] Basic admin module structure
- [ ] Admin authentication endpoints

### **Week 2: Core Admin Features**
- [ ] Dashboard analytics APIs
- [ ] User management APIs
- [ ] Company management APIs
- [ ] Basic activity logging

### **Week 3: Advanced Features**
- [ ] Job management APIs
- [ ] Bulk upload functionality
- [ ] System settings management
- [ ] Advanced analytics

### **Week 4: Security & Testing**
- [ ] Security enhancements
- [ ] Performance optimizations
- [ ] Comprehensive testing
- [ ] Documentation and deployment

## 🔧 **Implementation Notes**

### **Backward Compatibility**
- All existing APIs remain unchanged
- New admin fields are nullable to avoid breaking existing data
- Gradual rollout with feature flags

### **Data Migration**
- Existing users will have `is_active: true` and `is_verified: false` by default
- Existing jobs will have `admin_status: 'approved'` by default
- Existing companies will have `admin_status: 'pending'` by default

### **Security Considerations**
- Admin actions are logged with IP address and user agent
- Rate limiting prevents abuse
- Permission-based access control
- Audit trail for all admin operations

### **Performance Considerations**
- Database indexes for optimal query performance
- Caching for frequently accessed data
- Pagination for large datasets
- Background processing for bulk operations

This implementation plan provides a comprehensive roadmap for adding admin functionality to the Jobsmato backend while maintaining system stability and performance.
