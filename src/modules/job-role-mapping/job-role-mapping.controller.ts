import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { JobRoleMappingService } from './job-role-mapping.service';

@Controller('job-role-mappings')
@UseGuards(JwtAuthGuard)
export class JobRoleMappingController {
  constructor(private readonly service: JobRoleMappingService) {}

  /**
   * Get or auto-create mapping for a job title.
   * Returns training roles and candidate count.
   */
  @Get('by-title/:jobTitle')
  getByTitle(@Param('jobTitle') jobTitle: string) {
    return this.service.getOrCreateMapping(jobTitle);
  }

  /**
   * Admin: Save/update a role mapping.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  saveMapping(
    @Body() body: { jobTitle: string; trainingRoles: string[] },
    @CurrentUser() user: any,
  ) {
    return this.service.saveMapping(body.jobTitle, body.trainingRoles, user.id);
  }

  /**
   * Admin: List all saved mappings.
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllMappings(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.getAllMappings(+page, +limit);
  }

  /**
   * Admin: Delete a mapping.
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteMapping(@Param('id') id: string) {
    return this.service.deleteMapping(id);
  }
}
