import {
  Controller, Post, Patch, Get, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivityLogsService } from './activity-logs.service';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Post()
  log(@CurrentUser() user: any, @Body() body: any) {
    return this.activityLogsService.log(user.id, body);
  }

  @Get('my/today')
  getTodayStats(
    @CurrentUser() user: any,
    @Query('enrollmentId') enrollmentId: string,
  ) {
    return this.activityLogsService.getTodayStats(enrollmentId, user.id);
  }

  @Get('my/week/:weekNumber')
  getWeekStats(
    @CurrentUser() user: any,
    @Query('enrollmentId') enrollmentId: string,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
  ) {
    return this.activityLogsService.getWeekStats(enrollmentId, user.id, weekNumber);
  }

  @Get('my/logs')
  getMyLogs(
    @CurrentUser() user: any,
    @Query('enrollmentId') enrollmentId: string,
    @Query('page') page = 1,
  ) {
    return this.activityLogsService.getMyLogs(enrollmentId, user.id, +page);
  }

  @Get('my/candidate/:candidateId')
  getCandidateLog(
    @CurrentUser() user: any,
    @Query('enrollmentId') enrollmentId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.activityLogsService.getCandidateLog(enrollmentId, user.id, candidateId);
  }

  /** Update pipeline stage + any fields on an existing log */
  @Patch(':id')
  updateLog(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.activityLogsService.updateLog(id, user.id, body);
  }

  /** Upsert log for a candidate — create if none exists, update if it does */
  @Post('upsert')
  upsertLog(@CurrentUser() user: any, @Body() body: any) {
    return this.activityLogsService.upsertLog(user.id, body);
  }

  /**
   * Admin: Search talent pool against new vacancy criteria.
   * Flow: New Vacancy → Skill/Location/Salary Matching → Generate Candidate List
   */
  @Post('admin/talent-pool/match')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  matchTalentPool(@Body() body: {
    cities?: string[];
    skills?: string;
    salaryMin?: number;
    salaryMax?: number;
    jobTitle?: string;
    jobId?: number;
  }) {
    return this.activityLogsService.matchTalentPool(body);
  }

  /** Admin: Get all talent pool candidates (for overview) */
  @Get('admin/talent-pool')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getTalentPool(
    @Query('page') page = 1,
    @Query('stage') stage?: string,
  ) {
    return this.activityLogsService.getTalentPool(+page, stage);
  }
}
