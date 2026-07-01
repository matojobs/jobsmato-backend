import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermission, AdminPermissionGuard } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminMasterDataService } from '../services/admin-master-data.service';

class MasterDataQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  companyId?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}

class CreateAdminJobRoleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  companyId: number;

  @IsString()
  roleName: string;

  @IsOptional()
  @IsString()
  department?: string;
}

class UpdateAdminJobRoleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  companyId?: number;

  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateCityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  state?: string;
}

class UpdateCityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('admin-master-data')
@Controller('admin/master-data')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminMasterDataController {
  constructor(private readonly masterDataService: AdminMasterDataService) {}

  @Get('job-roles')
  @AdminPermissions(AdminPermission.VIEW_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'List sourcing job roles' })
  getJobRoles(@Query() query: MasterDataQueryDto) {
    return this.masterDataService.getJobRoles({
      ...query,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });
  }

  @Post('job-roles')
  @AdminPermissions(AdminPermission.CREATE_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Create sourcing job role' })
  createJobRole(@Body() body: CreateAdminJobRoleDto) {
    return this.masterDataService.createJobRole(body);
  }

  @Put('job-roles/:id')
  @AdminPermissions(AdminPermission.EDIT_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update sourcing job role' })
  updateJobRole(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateAdminJobRoleDto) {
    return this.masterDataService.updateJobRole(id, body);
  }

  @Get('cities')
  @AdminPermissions(AdminPermission.VIEW_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'List admin-managed cities' })
  getCities(@Query() query: MasterDataQueryDto) {
    return this.masterDataService.getCities({
      ...query,
      isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
    });
  }

  @Post('cities')
  @AdminPermissions(AdminPermission.CREATE_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Create admin-managed city' })
  createCity(@Body() body: CreateCityDto) {
    return this.masterDataService.createCity(body);
  }

  @Put('cities/:id')
  @AdminPermissions(AdminPermission.EDIT_COMPANIES)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update admin-managed city' })
  updateCity(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCityDto) {
    return this.masterDataService.updateCity(id, body);
  }
}
