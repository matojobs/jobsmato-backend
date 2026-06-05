import {
  Controller, Get, Query, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { FunnelQueryDto } from './dto/funnel-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterGuard } from '../recruiter/guards/recruiter.guard';
import { RecruiterService } from '../recruiter/recruiter.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

/**
 * Recruiter-scoped analytics. Always forced to the caller's own recruiter_id —
 * recruiters can never see another recruiter's numbers here. Same service (and
 * therefore same definitions) as the admin endpoint.
 */
@ApiTags('Analytics')
@Controller('recruiter/analytics')
@UseGuards(JwtAuthGuard, RecruiterGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiBearerAuth()
export class AnalyticsRecruiterController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly recruiterService: RecruiterService,
  ) {}

  @Get('funnel')
  @ApiOperation({ summary: 'Funnel + rates (+ optional series) scoped to the current recruiter' })
  async funnel(@CurrentUser() user: User, @Query() q: FunnelQueryDto) {
    const recruiterId = await this.recruiterService.getRecruiterIdByEmail(user.email);
    return this.analytics.getFunnel({
      from: q.from,
      to: q.to,
      recruiterId,
      granularity: q.granularity ?? 'none',
    });
  }
}
