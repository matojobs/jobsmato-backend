import { Controller, Get, Post, Query, Body, UseGuards, ParseIntPipe, DefaultValuePipe, Optional } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { TrainingDataService } from './training-data.service';

@Controller('training-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TrainingDataController {
  constructor(private readonly trainingDataService: TrainingDataService) {}

  @Get('admin/stats')
  getStats() {
    return this.trainingDataService.getStats();
  }

  @Get('admin/candidates')
  async findAll(@Query('page') page = 1, @Query('search') search?: string) {
    const [items, total] = await this.trainingDataService.findAll(+page, search);
    return { items, total };
  }

  @Get('admin/companies')
  getCompanies() {
    return this.trainingDataService.getCompanies();
  }

  @Get('admin/profiles')
  getProfiles(@Query('companies') companies?: string) {
    const list = companies ? companies.split(',').map(s => s.trim()).filter(Boolean) : [];
    return this.trainingDataService.getProfiles(list);
  }

  @Get('admin/cities')
  getCities(
    @Query('companies') companies?: string,
    @Query('profiles') profiles?: string,
  ) {
    const c = companies ? companies.split(',').map(s => s.trim()).filter(Boolean) : [];
    const p = profiles ? profiles.split(',').map(s => s.trim()).filter(Boolean) : [];
    return this.trainingDataService.getCities(c, p);
  }

  @Post('admin/preview')
  previewCandidates(
    @Body('companies') companies: string[] = [],
    @Body('profiles') profiles: string[] = [],
    @Body('cities') cities: string[] = [],
    @Query('page') page = 1,
  ) {
    return this.trainingDataService.previewCandidates(companies, profiles, cities, +page);
  }

  /**
   * Scored candidate suggestions for a job.
   * GET /training-data/admin/suggest?jobId=11&minExp=1&maxExp=3&pool=unassigned&page=1
   */
  @Get('admin/suggest')
  suggest(
    @Query('jobId') jobId: string,
    @Query('minExp') minExp?: string,
    @Query('maxExp') maxExp?: string,
    @Query('pool') pool?: 'unassigned' | 'talent_pool',
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.trainingDataService.suggestForJob({
      jobId: +jobId,
      minExp: minExp != null && minExp !== '' ? +minExp : undefined,
      maxExp: maxExp != null && maxExp !== '' ? +maxExp : undefined,
      pool: pool || 'unassigned',
      page: +page,
      limit: +limit,
    });
  }

  /**
   * Manual trigger: reset stale assignments back to unassigned pool.
   * POST /training-data/admin/reset-stale?days=7
   */
  @Post('admin/reset-stale')
  resetStale(@Query('days') days?: string) {
    return this.trainingDataService.manualResetStale(days ? +days : 7);
  }

  /**
   * Release a single candidate back to the pool.
   * POST /training-data/admin/release/:id
   */
  @Post('admin/release')
  releaseCandidate(@Body('candidateId') candidateId: number) {
    return this.trainingDataService.releaseCandidate(candidateId);
  }
}
