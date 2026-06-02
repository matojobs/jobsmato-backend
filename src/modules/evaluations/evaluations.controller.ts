import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EvaluationsService } from './evaluations.service';

@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get('enrollment/:enrollmentId')
  getByEnrollment(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: any) {
    return this.evaluationsService.getByEnrollment(enrollmentId, user.id);
  }
}
