import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto, JobSearchDto, JobResponseDto } from './dto/job.dto';
import { Industry } from '../../entities/job.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { User, UserRole } from '../../entities/user.entity';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RECRUITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job posting' })
  @ApiResponse({
    status: 201,
    description: 'Job successfully created',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only employers or recruiters can post jobs' })
  async create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    return this.jobsService.create(createJobDto, user.id);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Search and filter jobs (role-based visibility)' })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobs: { type: 'array', items: { $ref: '#/components/schemas/JobResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'For employers: Only their own jobs. For candidates: All active jobs. For admins: All jobs.',
  })
  async findAll(@Query() searchDto: JobSearchDto, @CurrentUser() user?: User) {
    return this.jobsService.findAll(searchDto, user);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured jobs' })
  @ApiResponse({
    status: 200,
    description: 'Featured jobs retrieved successfully',
    type: [JobResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of jobs to return' })
  async getFeaturedJobs(@Query('limit') limit?: number): Promise<JobResponseDto[]> {
    return this.jobsService.getFeaturedJobs(limit);
  }

  @Get('hot')
  @ApiOperation({ summary: 'Get hot/urgent jobs' })
  @ApiResponse({
    status: 200,
    description: 'Hot jobs retrieved successfully',
    type: [JobResponseDto],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of jobs to return' })
  async getHotJobs(@Query('limit') limit?: number): Promise<JobResponseDto[]> {
    return this.jobsService.getHotJobs(limit);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get job categories with counts' })
  @ApiResponse({
    status: 200,
    description: 'Job categories retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  async getJobCategories() {
    return this.jobsService.getJobCategories();
  }

  @Get('industry/:industry')
  @ApiOperation({ summary: 'Get jobs by specific industry' })
  @ApiResponse({
    status: 200,
    description: 'Jobs in the specified industry retrieved successfully',
    type: [JobResponseDto],
  })
  async getJobsByIndustry(@Param('industry') industryParam: string): Promise<JobResponseDto[]> {
    // Decode URL parameter and find matching industry enum value
    const decodedIndustry = decodeURIComponent(industryParam);
    
    // Try to find matching enum value (case-insensitive partial match)
    const industryValues = Object.values(Industry);
    const matchedIndustry = industryValues.find(
      (val) => val.toLowerCase().includes(decodedIndustry.toLowerCase()) ||
               decodedIndustry.toLowerCase().includes(val.toLowerCase().split(' ')[0])
    );
    
    if (!matchedIndustry) {
      throw new NotFoundException(`Industry "${decodedIndustry}" not found. Available industries: ${industryValues.join(', ')}`);
    }
    
    return this.jobsService.getJobsByIndustry(matchedIndustry as Industry);
  }

  @Get('stats/industries')
  @ApiOperation({ summary: 'Get industry statistics with job counts' })
  @ApiResponse({
    status: 200,
    description: 'Industry statistics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          industry: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  async getIndustryStats() {
    return this.jobsService.getIndustryStats();
  }

  @Get('my-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RECRUITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer\'s own jobs' })
  @ApiResponse({
    status: 200,
    description: 'Employer\'s jobs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobs: { type: 'array', items: { $ref: '#/components/schemas/JobResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only employers or recruiters can access this endpoint' })
  async getMyJobs(@Query() searchDto: JobSearchDto, @CurrentUser() user: User) {
    return this.jobsService.getMyJobs(user.id, searchDto);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get jobs by company' })
  @ApiResponse({
    status: 200,
    description: 'Company jobs retrieved successfully',
    type: [JobResponseDto],
  })
  async getJobsByCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.jobsService.getJobsByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({
    status: 200,
    description: 'Job retrieved successfully',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<JobResponseDto> {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RECRUITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job posting' })
  @ApiResponse({
    status: 200,
    description: 'Job successfully updated',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only update your own jobs' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser() user: User,
  ): Promise<JobResponseDto> {
    return this.jobsService.update(id, updateJobDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RECRUITER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job posting' })
  @ApiResponse({
    status: 200,
    description: 'Job successfully deleted',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only delete your own jobs' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.jobsService.remove(id, user.id);
  }

  @Get(':id/similar')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get similar jobs' })
  @ApiResponse({
    status: 200,
    description: 'Similar jobs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              location: { type: 'string' },
              type: { type: 'string' },
              category: { type: 'string' },
              industry: { type: 'string' },
              experience: { type: 'number' },
              salary: { type: 'string' },
              isRemote: { type: 'boolean' },
              score: { type: 'number' },
              company: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  logo: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Invalid job ID' })
  async getSimilarJobs(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ): Promise<{ jobs: any[] }> {
    const limitNum = limit ? parseInt(limit) : 3;
    return this.jobsService.getSimilarJobs(id, limitNum);
  }

  @Get(':id/stats')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiResponse({
    status: 200,
    description: 'Job statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobStats: {
          type: 'object',
          properties: {
            applicants: { type: 'number', example: 25 },
            views: { type: 'number', example: 150 },
            posted: { type: 'string', example: '2 days ago' },
            expires: { type: 'string', example: '30 days' },
            applications: { type: 'number', example: 25 },
            shortlisted: { type: 'number', example: 0 },
            interviewed: { type: 'number', example: 0 },
            hired: { type: 'number', example: 0 },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStats(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getJobStats(id);
  }

  @Post(':id/view')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Track job view' })
  @ApiResponse({
    status: 201,
    description: 'Job view tracked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async trackJobView(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @CurrentUser() user?: User,
  ) {
    return this.jobsService.trackJobView(id, req, user);
  }
}
