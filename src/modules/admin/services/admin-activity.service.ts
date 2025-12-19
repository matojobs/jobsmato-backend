import { Injectable } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminActivityService {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  async getActivityLogs(query: any) {
    return this.adminAuditService.getActivityLogs(
      query.page || 1,
      query.limit || 20,
      {
        adminId: query.adminId,
        actionType: query.actionType,
        targetType: query.targetType,
        startDate: query.startDate,
        endDate: query.endDate,
      },
    );
  }

  async exportActivityLogs(query: any) {
    return this.adminAuditService.exportActivityLogs({
      adminId: query.adminId,
      actionType: query.actionType,
      targetType: query.targetType,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}



