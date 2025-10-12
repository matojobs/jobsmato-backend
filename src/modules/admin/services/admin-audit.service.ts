import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminActionLog } from '../../../entities/admin-action-log.entity';
import { User } from '../../../entities/user.entity';

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminActionLog)
    private adminActionLogRepository: Repository<AdminActionLog>,
  ) {}

  async logAction(
    adminId: number,
    actionType: string,
    targetType: string,
    targetId: number | null,
    description: string,
    metadata: any,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminActionLog> {
    const log = this.adminActionLogRepository.create({
      adminId,
      actionType,
      targetType,
      targetId: targetId || undefined,
      description,
      metadata,
      ipAddress,
      userAgent,
    });

    return this.adminActionLogRepository.save(log);
  }

  async getActivityLogs(
    page: number = 1,
    limit: number = 20,
    filters: {
      adminId?: number;
      actionType?: string;
      targetType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const queryBuilder = this.adminActionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.adminId) {
      queryBuilder.andWhere('log.adminId = :adminId', { adminId: filters.adminId });
    }

    if (filters.actionType) {
      queryBuilder.andWhere('log.actionType = :actionType', { actionType: filters.actionType });
    }

    if (filters.targetType) {
      queryBuilder.andWhere('log.targetType = :targetType', { targetType: filters.targetType });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminActivityStats(adminId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.adminActionLogRepository
      .createQueryBuilder('log')
      .select('log.actionType', 'actionType')
      .addSelect('COUNT(*)', 'count')
      .where('log.adminId = :adminId', { adminId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy('log.actionType')
      .getRawMany();

    return stats.map(stat => ({
      actionType: stat.actionType,
      count: parseInt(stat.count),
    }));
  }

  async exportActivityLogs(
    filters: {
      adminId?: number;
      actionType?: string;
      targetType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const queryBuilder = this.adminActionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .orderBy('log.createdAt', 'DESC');

    if (filters.adminId) {
      queryBuilder.andWhere('log.adminId = :adminId', { adminId: filters.adminId });
    }

    if (filters.actionType) {
      queryBuilder.andWhere('log.actionType = :actionType', { actionType: filters.actionType });
    }

    if (filters.targetType) {
      queryBuilder.andWhere('log.targetType = :targetType', { targetType: filters.targetType });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
    }

    return queryBuilder.getMany();
  }
}
