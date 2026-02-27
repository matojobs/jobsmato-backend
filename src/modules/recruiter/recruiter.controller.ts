import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecruiterService } from './recruiter.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { ApplicationQueryDto } from './dto/query-params.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterGuard } from './guards/recruiter.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Recruiter')
@Controller('recruiter')
@UseGuards(JwtAuthGuard, RecruiterGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@ApiBearerAuth()
export class RecruiterController {
  constructor(private readonly recruiterService: RecruiterService) {}

  /**
   * Helper method to get recruiter ID from user
   * Uses optimized service method
   */
  private async getRecruiterId(user: User): Promise<number> {
    return this.recruiterService.getRecruiterIdByEmail(user.email);
  }

  // ============================================
  // MASTER DATA ENDPOINTS
  // ============================================

  @Get('recruiters')
  @ApiOperation({ summary: 'Get all recruiters' })
  @ApiResponse({ status: 200, description: 'List of recruiters' })
  async getRecruiters() {
    return this.recruiterService.getRecruiters();
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get all companies with job roles count' })
  @ApiResponse({ status: 200, description: 'List of companies with job roles count' })
  async getCompanies() {
    return this.recruiterService.getCompanies();
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Get company by ID with job roles' })
  @ApiResponse({ status: 200, description: 'Company details with job roles' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyById(@Param('id', ParseIntPipe) id: number) {
    return this.recruiterService.getCompanyById(id);
  }

  @Get('job-roles')
  @ApiOperation({ summary: 'Get all job roles with company details' })
  @ApiResponse({ status: 200, description: 'List of job roles with company info' })
  async getJobRoles(@Query('company_id') companyId?: number) {
    return this.recruiterService.getJobRoles(companyId);
  }

  @Get('job-roles/:id')
  @ApiOperation({ summary: 'Get job role by ID with company details' })
  @ApiResponse({ status: 200, description: 'Job role details with company info' })
  @ApiResponse({ status: 404, description: 'Job role not found' })
  async getJobRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.recruiterService.getJobRoleById(id);
  }

  @Get('sourced-job-roles')
  @ApiOperation({ summary: 'Job roles this recruiter has sourced candidates for (Sourcing page)' })
  @ApiResponse({ status: 200, description: 'List of job roles with application count' })
  async getSourcedJobRoles(@CurrentUser() user: User) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getSourcedJobRoles(recruiterId);
  }

  @Post('job-roles')
  @ApiOperation({ summary: 'Create job role' })
  @ApiResponse({ status: 201, description: 'Job role created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  async createJobRole(@Body() dto: CreateJobRoleDto) {
    return this.recruiterService.createJobRole(dto);
  }

  @Get('candidates')
  @ApiOperation({ summary: 'Get candidates assigned to this recruiter' })
  @ApiResponse({ status: 200, description: 'List of candidates' })
  async getCandidates(
    @Query('search') search?: string,
    @CurrentUser() user?: User,
  ) {
    const recruiterId = user ? await this.getRecruiterId(user) : undefined;
    return this.recruiterService.getCandidates(search, recruiterId);
  }

  @Post('candidates')
  @ApiOperation({ summary: 'Create candidate' })
  @ApiResponse({ status: 201, description: 'Candidate created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  async createCandidate(
    @Body() dto: CreateCandidateDto,
    @CurrentUser() user: User,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.createCandidate(dto, recruiterId);
  }

  // ============================================
  // APPLICATIONS CRUD
  // ============================================

  @Get('applications')
  @ApiOperation({ summary: 'Get applications with filters (sourcing + job portal where recruiter filled call)' })
  @ApiResponse({ status: 200, description: 'List of applications' })
  async getApplications(
    @Query() query: ApplicationQueryDto,
    @CurrentUser() user: User,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getApplications(query, recruiterId, user.id);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get application by ID (sourcing or job portal)' })
  @ApiResponse({ status: 200, description: 'Application found' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getApplicationById(id, recruiterId, user.id);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Create application' })
  @ApiResponse({ status: 201, description: 'Application created' })
  @ApiResponse({ status: 400, description: 'Bad request - duplicate or validation error' })
  @HttpCode(HttpStatus.CREATED)
  async createApplication(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: User,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.createApplication(dto, recruiterId);
  }

  @Patch('applications/:id')
  @ApiOperation({ summary: 'Update application (sourcing or job portal)' })
  @ApiResponse({ status: 200, description: 'Application updated' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: User,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.updateApplication(id, dto, recruiterId, user.id);
  }

  @Delete('applications/:id')
  @ApiOperation({ summary: 'Delete application' })
  @ApiResponse({ status: 200, description: 'Application deleted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @HttpCode(HttpStatus.OK)
  async deleteApplication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    await this.recruiterService.deleteApplication(id, recruiterId);
    return { message: 'Application deleted successfully' };
  }

  // ============================================
  // DASHBOARD ENDPOINTS
  // ============================================

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics (sourcing + job portal applications recruiter worked on)' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats(@CurrentUser() user: User) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getDashboardStats(recruiterId, user.id);
  }

  @Get('dashboard/pipeline')
  @ApiOperation({ summary: 'Get pipeline breakdown (sourcing + job portal applications recruiter worked on)' })
  @ApiResponse({ status: 200, description: 'Pipeline data' })
  async getPipeline(@CurrentUser() user: User) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getPipeline(recruiterId, user.id);
  }

  @Get('dashboard/today-progress')
  @ApiOperation({ summary: 'Get recruiter today progress (Flow Tracking — stage counts for current day only)' })
  @ApiResponse({ status: 200, description: 'Today progress stages (sourced, call done, connected, etc.)' })
  async getTodayProgress(@CurrentUser() user: User) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getTodayProgress(recruiterId, user.id);
  }

  @Get('reports/recruiter-performance')
  @ApiOperation({ summary: 'Get recruiter performance report' })
  @ApiResponse({ status: 200, description: 'Performance report' })
  async getRecruiterPerformance(
    @CurrentUser() user: User,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const recruiterId = await this.getRecruiterId(user);
    return this.recruiterService.getRecruiterPerformance(
      recruiterId,
      startDate,
      endDate,
    );
  }
}
