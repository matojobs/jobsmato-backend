import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OperationsService } from './operations.service';

@ApiTags('operations')
@Controller('operations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OperationsController {
  constructor(private readonly svc: OperationsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Operations dashboard stats (legacy)' })
  getStats() {
    return this.svc.getStats();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Enhanced ops dashboard with action queue' })
  getDashboard() {
    return this.svc.getDashboardStats();
  }

  @Get('companies')
  @ApiOperation({ summary: 'List client companies for interview scheduling dropdown' })
  getCompanies() {
    return this.svc.getClientCompanies();
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get candidate pipeline (submitted+)' })
  getPipeline(
    @Query('stage') stage?: string,
    @Query('domain') domain?: string,
    @Query('enrollmentId') enrollmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.getPipeline({ stage, domain, enrollmentId, page: Number(page), limit: Number(limit), search });
  }

  @Get('pipeline/:logId')
  @ApiOperation({ summary: 'Get single candidate log detail' })
  getLog(@Param('logId') logId: string) {
    return this.svc.getLog(logId);
  }

  @Patch('pipeline/:logId/interview')
  @ApiOperation({ summary: 'Schedule interview for a candidate' })
  scheduleInterview(
    @Param('logId') logId: string,
    @Body() body: {
      interviewDate: string; interviewTime?: string;
      clientName: string; interviewMode: string;
      interviewLocation?: string; opsNotes?: string;
      round?: 'r1' | 'r2' | 'final';
    },
  ) {
    return this.svc.scheduleInterview(logId, body);
  }

  @Patch('pipeline/:logId/outcome')
  @ApiOperation({ summary: 'Update interview outcome' })
  updateOutcome(
    @Param('logId') logId: string,
    @Body() body: {
      outcome: 'selected' | 'client_rejected' | 'interview_failed' | 'offer_accepted' | 'joined';
      clientFeedback?: string; opsNotes?: string;
      expectedJoiningDate?: string; joiningDate?: string;
    },
  ) {
    return this.svc.updateOutcome(logId, body);
  }
}
