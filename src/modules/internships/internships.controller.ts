import {
  Controller, Post, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { InternshipsService } from './internships.service';

@Controller('internships')
@UseGuards(JwtAuthGuard)
export class InternshipsController {
  constructor(private readonly internshipsService: InternshipsService) {}

  @Post('enroll')
  enroll(@CurrentUser() user: any, @Body() body: any) {
    return this.internshipsService.enroll(user.id, body);
  }

  @Get('my')
  getMy(@CurrentUser() user: any) {
    return this.internshipsService.getMy(user.id);
  }

  @Get('my/history')
  getMyHistory(@CurrentUser() user: any) {
    return this.internshipsService.getMyHistory(user.id);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllAdmin(
    @Query('domain') domain?: string,
    @Query('status') status?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.internshipsService.getAllAdmin({ domain, status, batchId });
  }

  @Patch('admin/:id/mentor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignMentor(@Param('id') id: string, @Body('mentorId') mentorId: number) {
    return this.internshipsService.assignMentor(id, mentorId);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('finalScore') finalScore?: number,
    @Body('finalGrade') finalGrade?: string,
  ) {
    return this.internshipsService.updateStatus(id, status, finalScore, finalGrade);
  }

}
