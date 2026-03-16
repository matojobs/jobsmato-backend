import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminRecruiterPerformanceService } from '../services/admin-recruiter-performance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';

@ApiTags('admin-recruiter-performance')
@Controller('admin/recruiter-performance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminRecruiterPerformanceController {
  constructor(
    private readonly adminRecruiterPerformanceService: AdminRecruiterPerformanceService,
  ) {}

  @Get('dod')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Day-over-day report: one row per recruiter + total' })
  @ApiQuery({ name: 'date', required: false, description: 'Date YYYY-MM-DD (default: today)' })
  @ApiResponse({ status: 200, description: 'DOD report rows' })
  async getDod(@Query('date') date?: string) {
    return this.adminRecruiterPerformanceService.getDod(date);
  }

  @Get('mtd')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Month-to-date report: one row per recruiter + total' })
  @ApiQuery({ name: 'month', required: false, description: 'Month YYYY-MM (default: current month)' })
  @ApiResponse({ status: 200, description: 'MTD report rows' })
  async getMtd(@Query('month') month?: string) {
    return this.adminRecruiterPerformanceService.getMtd(month);
  }

  @Get('individual')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Single recruiter performance (DOD or MTD)' })
  @ApiQuery({ name: 'recruiter_id', required: true, type: Number })
  @ApiQuery({ name: 'period', required: false, enum: ['dod', 'mtd'], description: 'Default: mtd' })
  @ApiQuery({ name: 'date', required: false, description: 'For period=dod' })
  @ApiQuery({ name: 'month', required: false, description: 'For period=mtd' })
  @ApiResponse({ status: 200, description: 'Individual report row' })
  async getIndividual(
    @Query('recruiter_id') recruiterIdParam: string,
    @Query('period') period?: 'dod' | 'mtd',
    @Query('date') date?: string,
    @Query('month') month?: string,
  ) {
    const recruiterId = recruiterIdParam ? parseInt(recruiterIdParam, 10) : NaN;
    if (!Number.isInteger(recruiterId) || recruiterId < 1) {
      throw new BadRequestException('recruiter_id is required and must be a positive integer');
    }
    const p = period === 'dod' ? 'dod' : 'mtd';
    return this.adminRecruiterPerformanceService.getIndividual(
      recruiterId,
      p,
      date,
      month,
    );
  }

  @Get('company-wise')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Company-wise funnel (optional month for MTD)' })
  @ApiQuery({ name: 'month', required: false, description: 'Month YYYY-MM (omit for all-time)' })
  @ApiResponse({ status: 200, description: 'Company-wise rows' })
  async getCompanyWise(@Query('month') month?: string) {
    return this.adminRecruiterPerformanceService.getCompanyWise(month);
  }

  @Get('client-report')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'One company: MTD and DOD metrics side by side' })
  @ApiQuery({ name: 'company_id', required: true, type: Number })
  @ApiQuery({ name: 'date', required: false, description: 'For DOD' })
  @ApiQuery({ name: 'month', required: false, description: 'For MTD' })
  @ApiResponse({ status: 200, description: 'Client report' })
  async getClientReport(
    @Query('company_id', ParseIntPipe) companyId: number,
    @Query('date') date?: string,
    @Query('month') month?: string,
  ) {
    return this.adminRecruiterPerformanceService.getClientReport(
      companyId,
      date,
      month,
    );
  }

  @Get('negative-funnel/not-interested-remarks')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Not interested remarks by remark and job role' })
  @ApiQuery({ name: 'date', required: false, description: 'For DOD' })
  @ApiQuery({ name: 'month', required: false, description: 'For MTD' })
  @ApiResponse({ status: 200, description: 'Negative funnel remarks' })
  async getNotInterestedRemarks(
    @Query('date') date?: string,
    @Query('month') month?: string,
  ) {
    return this.adminRecruiterPerformanceService.getNotInterestedRemarks(
      date,
      month,
    );
  }

  @Get('interview-status-company-wise')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Interview status by company for a day (DOD)' })
  @ApiQuery({ name: 'date', required: false, description: 'Date YYYY-MM-DD (default: today)' })
  @ApiResponse({ status: 200, description: 'Interview status rows by company' })
  async getInterviewStatusCompanyWise(@Query('date') date?: string) {
    return this.adminRecruiterPerformanceService.getInterviewStatusCompanyWise(
      date,
    );
  }
}
