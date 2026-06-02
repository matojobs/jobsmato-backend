import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { BatchTasksService } from './batch-tasks.service';
import { AssignmentStatus } from '../../entities/task-assignment.entity';

@Controller('batch-tasks')
@UseGuards(JwtAuthGuard)
export class BatchTasksController {
  constructor(private readonly batchTasksService: BatchTasksService) {}

  // ── Admin routes ─────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAll() {
    return this.batchTasksService.getAll();
  }

  @Get('admin/batch/:batchId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getByBatch(@Param('batchId') batchId: string) {
    return this.batchTasksService.getByBatch(batchId);
  }

  /** Jobs that have city vacancies — for the task wizard picker */
  @Get('admin/jobs-with-vacancies')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getJobsWithVacancies() {
    return this.batchTasksService.getJobsWithVacancies();
  }

  /** Live fill-rate per city for a job's vacancies (derived, not stored) */
  @Get('admin/job/:jobId/fill-rate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getJobFillRate(@Param('jobId') jobId: string) {
    return this.batchTasksService.getJobFillRate(+jobId);
  }

  /**
   * Create a task for a batch.
   * Body: { batchId, title, description?, weekNumber?, targetCallCount?,
   *         dueDate?, candidatesPerIntern?, candidateSource?, candidateCity? }
   * Auto-assigns candidatesPerIntern candidates to every active intern in that batch.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createTask(@Body() body: any) {
    return this.batchTasksService.createTask(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateTask(@Param('id') id: string, @Body() body: any) {
    return this.batchTasksService.updateTask(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteTask(@Param('id') id: string) {
    return this.batchTasksService.deleteTask(id);
  }

  /**
   * Manually assign more candidates to a specific enrollment.
   * Body: { count, taskId?, candidateSource?, candidateCity? }
   */
  @Post('admin/assign/:enrollmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignToEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body('count') count: number,
    @Body('taskId') taskId?: string,
    @Body('candidateSource') candidateSource?: string,
    @Body('candidateCity') candidateCity?: string,
  ) {
    return this.batchTasksService.assignToEnrollment(
      enrollmentId, count, taskId, candidateSource, candidateCity,
    );
  }

  // ── Intern routes ─────────────────────────────────────────────────

  /** Get all tasks for my batch with progress + (when linked) job vacancy context */
  @Get('my/:enrollmentId')
  getMyTasks(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: any) {
    return this.batchTasksService.getMyTasks(enrollmentId, user.id);
  }

  /** Map of remaining openings per city for a task's linked job */
  @Get('my/:enrollmentId/task/:taskId/city-remaining')
  getTaskCityRemaining(
    @Param('enrollmentId') enrollmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.batchTasksService.getTaskCityRemaining(enrollmentId, user.id, taskId);
  }

  /** Get my assigned candidates (optionally filtered by taskId) */
  @Get('my/:enrollmentId/candidates')
  getMyCandidates(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: any,
    @Query('taskId') taskId?: string,
    @Query('page') page = 1,
    @Query('search') search?: string,
  ) {
    return this.batchTasksService.getMyCandidates(enrollmentId, user.id, taskId, +page, search);
  }

  /** Mark an assignment as called/skipped */
  @Patch('assignment/:assignmentId')
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: any,
    @Body('enrollmentId') enrollmentId: string,
    @Body('status') status: AssignmentStatus,
  ) {
    return this.batchTasksService.updateAssignmentStatus(assignmentId, enrollmentId, status);
  }
}
