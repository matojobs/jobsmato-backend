import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
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
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsIn, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminCompaniesService } from '../services/admin-companies.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';
import { CompanySize } from '../../../entities/company.entity';

export class GetCompaniesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  adminStatus?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';
}

export class CreateCompanyDto {
  @ApiProperty({ example: 1, description: 'Owner user ID' })
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiProperty({ example: 'Tech Corp Inc.' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'tech-corp-inc', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsEnum(CompanySize)
  size?: CompanySize;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  foundedYear?: number;
}

export class UpdateCompanyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsEnum(CompanySize)
  size?: CompanySize;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  foundedYear?: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

@ApiTags('admin-companies')
@Controller('admin/companies')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminCompaniesController {
  constructor(private readonly adminCompaniesService: AdminCompaniesService) {}

  @Post()
  @AdminPermissions(AdminPermission.CREATE_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Create company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or user already has company' })
  async createCompany(@Body() body: CreateCompanyDto) {
    return this.adminCompaniesService.createCompany(body);
  }

  @Get()
  @AdminPermissions(AdminPermission.VIEW_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get all companies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'adminStatus', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  async getCompanies(@Query() query: GetCompaniesQueryDto) {
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

  @Put(':id')
  @AdminPermissions(AdminPermission.EDIT_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update company (full update)' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  async updateCompany(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCompanyDto) {
    return this.adminCompaniesService.updateCompany(id, body);
  }

  @Delete(':id')
  @AdminPermissions(AdminPermission.DELETE_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 400, description: 'Company has jobs; remove jobs first' })
  async deleteCompany(@Param('id', ParseIntPipe) id: number) {
    return this.adminCompaniesService.deleteCompany(id);
  }

  @Put(':id/status')
  @AdminPermissions(AdminPermission.EDIT_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update company status' })
  @ApiResponse({ status: 200, description: 'Company status updated successfully' })
  async updateCompanyStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; adminNotes?: string },
    @CurrentUser() admin?: User,
  ) {
    return this.adminCompaniesService.updateCompanyStatus(id, body.status, body.adminNotes, admin?.id);
  }

  @Post(':id/verify')
  @AdminPermissions(AdminPermission.VERIFY_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Verify company' })
  @ApiResponse({ status: 200, description: 'Company verified successfully' })
  async verifyCompany(@Param('id', ParseIntPipe) id: number, @CurrentUser() admin?: User) {
    return this.adminCompaniesService.verifyCompany(id, admin?.id);
  }
}



