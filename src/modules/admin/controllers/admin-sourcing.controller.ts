import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminSourcingService } from '../services/admin-sourcing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('admin-sourcing')
@Controller('admin/sourcing')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSourcingController {
  constructor(private readonly adminSourcingService: AdminSourcingService) {}

  @Get('applications')
  @ApiOperation({ summary: 'List all sourcing applications across all recruiters (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'recruiter_id', required: false, type: Number })
  @ApiQuery({ name: 'company_id', required: false, type: Number })
  @ApiQuery({ name: 'call_status', required: false, type: String })
  @ApiQuery({ name: 'selection_status', required: false, type: String })
  @ApiQuery({ name: 'joining_status', required: false, type: String })
  @ApiQuery({ name: 'interview_status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'date_field', required: false, enum: ['assigned_date', 'call_date', 'interview_date', 'joining_date', 'followup_date'] })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'ISO date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'ISO date (YYYY-MM-DD)' })
  async getSourcingApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('recruiter_id') recruiterId?: string,
    @Query('company_id') companyId?: string,
    @Query('call_status') callStatus?: string,
    @Query('selection_status') selectionStatus?: string,
    @Query('joining_status') joiningStatus?: string,
    @Query('interview_status') interviewStatus?: string,
    @Query('search') search?: string,
    @Query('date_field') dateField?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.adminSourcingService.getSourcingApplications({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      recruiter_id: recruiterId ? Number(recruiterId) : undefined,
      company_id: companyId ? Number(companyId) : undefined,
      call_status: callStatus,
      selection_status: selectionStatus,
      joining_status: joiningStatus,
      interview_status: interviewStatus,
      search,
      date_field: dateField,
      start_date: startDate,
      end_date: endDate,
    });
  }
}
