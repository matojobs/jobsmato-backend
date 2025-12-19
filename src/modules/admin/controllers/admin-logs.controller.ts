import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';
import { ErrorLogService } from '../../../common/services/error-log.service';

@ApiTags('admin')
@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminLogsController {
  constructor(private readonly errorLogService: ErrorLogService) {}

  @Get('errors')
  @ApiOperation({ summary: 'Get error logs' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'errorType', required: false, type: String })
  @ApiQuery({ name: 'statusCode', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Error logs retrieved successfully',
  })
  async getErrorLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('errorType') errorType?: string,
    @Query('statusCode', new ParseIntPipe({ optional: true })) statusCode?: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (errorType) filters.errorType = errorType;
    if (statusCode) filters.statusCode = statusCode;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.errorLogService.getErrorLogs(
      page || 1,
      limit || 50,
      filters,
    );
  }
}

