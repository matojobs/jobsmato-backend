import {
  Controller, Get, Query, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { FunnelQueryDto, ScorecardQueryDto } from './dto/funnel-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

/**
 * Admin analytics — overall or filtered by recruiter / company / portal.
 * Reads the same AnalyticsService as the recruiter endpoint, so numbers match.
 */
@ApiTags('Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiBearerAuth()
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('funnel')
  @ApiOperation({ summary: 'Funnel + rates (+ optional series), any scope' })
  funnel(@Query() q: FunnelQueryDto) {
    return this.analytics.getFunnel({
      from: q.from,
      to: q.to,
      recruiterId: q.recruiter_id,
      companyId: q.company_id,
      portal: q.portal,
      granularity: q.granularity ?? 'none',
    });
  }

  @Get('recruiters')
  @ApiOperation({ summary: 'Per-recruiter scorecards for a range (leaderboard)' })
  recruiters(@Query() q: ScorecardQueryDto) {
    return this.analytics.getRecruiterScorecards({
      from: q.from,
      to: q.to,
      companyId: q.company_id,
      portal: q.portal,
    });
  }

  @Get('by-portal')
  @ApiOperation({ summary: 'One funnel per sourcing portal (portal quality)' })
  byPortal(@Query() q: ScorecardQueryDto) {
    return this.analytics.getGroupedFunnel('portal', { from: q.from, to: q.to });
  }

  @Get('by-company')
  @ApiOperation({ summary: 'One funnel per company (company health)' })
  byCompany(@Query() q: ScorecardQueryDto) {
    return this.analytics.getGroupedFunnel('company', { from: q.from, to: q.to });
  }

  @Get('negative-funnel')
  @ApiOperation({ summary: 'Reason breakdown: not interested, not attended, rejected, backed out' })
  negativeFunnel(@Query() q: ScorecardQueryDto) {
    return this.analytics.getNegativeFunnel({ from: q.from, to: q.to });
  }
}
