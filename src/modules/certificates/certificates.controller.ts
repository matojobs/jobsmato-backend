import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMy(@CurrentUser() user: any) {
    return this.certificatesService.getMy(user.id);
  }

  @Get('verify/:certNumber')
  verify(@Param('certNumber') certNumber: string) {
    return this.certificatesService.verify(certNumber);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  generate(@Body('enrollmentId') enrollmentId: string, @Body('certType') certType: string) {
    return this.certificatesService.generate(enrollmentId, certType);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listAdmin(@Query('page') page = 1) {
    const [items, total] = await this.certificatesService.listAdmin(+page);
    return { items, total };
  }
}
