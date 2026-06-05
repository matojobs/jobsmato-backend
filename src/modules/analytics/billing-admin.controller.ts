import {
  Controller, Get, Post, Query, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@ApiTags('Billing')
@Controller('admin/billing')
@UseGuards(JwtAuthGuard, AdminGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiBearerAuth()
export class BillingAdminController {
  constructor(private readonly billing: BillingService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Generate billing lines from joined candidates + process backout credits' })
  async sync() {
    const created = await this.billing.syncQueue();
    const credited = await this.billing.processBackouts();
    return { ...created, ...credited };
  }

  @Get('queue')
  @ApiOperation({ summary: 'Billing queue (optional status / month filter)' })
  queue(@Query('status') status?: string, @Query('month') month?: string) {
    return this.billing.getQueue(status, month);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Yearly billing dashboard' })
  dashboard(@Query('year') year?: string) {
    return this.billing.getDashboard(year ? Number(year) : new Date().getFullYear());
  }

  @Get('revenue-by-recruiter')
  @ApiOperation({ summary: 'Revenue contributed per recruiter for a range' })
  revenue(@Query('from') from: string, @Query('to') to: string) {
    return this.billing.getRevenueByRecruiter(from, to);
  }
}
