import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminCompaniesService } from '../services/admin-companies.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';

@ApiTags('admin-companies')
@Controller('admin/companies')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminCompaniesController {
  constructor(private readonly adminCompaniesService: AdminCompaniesService) {}

  @Get()
  @AdminPermissions(AdminPermission.VIEW_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  async getCompanies(@Query() query: any) {
    return this.adminCompaniesService.getCompanies(query);
  }

  @Get(':id')
  @AdminPermissions(AdminPermission.VIEW_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get specific company details' })
  @ApiResponse({ status: 200, description: 'Company details retrieved successfully' })
  async getCompany(@Param('id', ParseIntPipe) id: number) {
    return this.adminCompaniesService.getCompany(id);
  }

  @Put(':id/status')
  @AdminPermissions(AdminPermission.EDIT_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update company status' })
  @ApiResponse({ status: 200, description: 'Company status updated successfully' })
  async updateCompanyStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; adminNotes?: string },
  ) {
    return this.adminCompaniesService.updateCompanyStatus(id, body.status, body.adminNotes);
  }

  @Post(':id/verify')
  @AdminPermissions(AdminPermission.VERIFY_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Verify company' })
  @ApiResponse({ status: 200, description: 'Company verified successfully' })
  async verifyCompany(@Param('id', ParseIntPipe) id: number) {
    return this.adminCompaniesService.verifyCompany(id);
  }
}
