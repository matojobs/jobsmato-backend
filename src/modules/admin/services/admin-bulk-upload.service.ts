import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkUpload, BulkUploadStatus } from '../../../entities/bulk-upload.entity';
import { Job, JobStatus, JobType } from '../../../entities/job.entity';
import { Company } from '../../../entities/company.entity';

const REQUIRED_JOB_FIELDS = ['title', 'description', 'requirements', 'companyId', 'location', 'type', 'category'];
const VALID_JOB_TYPES = Object.values(JobType);

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '') || 'job';
}

@Injectable()
export class AdminBulkUploadService {
  constructor(
    @InjectRepository(BulkUpload)
    private bulkUploadRepository: Repository<BulkUpload>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async validateBulkData(data: any[]) {
    const results: { row: number; valid: boolean; errors?: string[] }[] = [];
    let errors = 0;
    let warnings = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      const rowErrors: string[] = [];

      for (const field of REQUIRED_JOB_FIELDS) {
        if (row[field] === undefined || row[field] === null || String(row[field]).trim() === '') {
          rowErrors.push(`Missing or empty: ${field}`);
        }
      }
      if (row.type && !VALID_JOB_TYPES.includes(row.type)) {
        rowErrors.push(`Invalid type. Use one of: ${VALID_JOB_TYPES.join(', ')}`);
      }
      if (row.companyId != null && (Number.isNaN(Number(row.companyId)) || Number(row.companyId) < 1)) {
        rowErrors.push('companyId must be a positive number');
      }

      if (rowErrors.length > 0) {
        errors++;
        results.push({ row: rowNum, valid: false, errors: rowErrors });
      } else {
        results.push({ row: rowNum, valid: true });
      }
    }

    return {
      valid: errors === 0,
      results,
      summary: {
        total: data.length,
        valid: data.length - errors,
        errors,
        warnings,
      },
    };
  }

  async processBulkUpload(data: any[], options: { filename?: string } | null, adminId: number) {
    const total = data.length;
    const upload = this.bulkUploadRepository.create({
      adminId,
      filename: options?.filename ?? `bulk-${Date.now()}.json`,
      totalRecords: total,
      successfulRecords: 0,
      failedRecords: 0,
      status: BulkUploadStatus.PROCESSING,
      errorLog: [],
    });
    await this.bulkUploadRepository.save(upload);

    const errorLog: { row: number; error: string }[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      try {
        const companyId = Number(row.companyId);
        const company = await this.companyRepository.findOne({ where: { id: companyId } });
        if (!company) {
          throw new Error(`Company ${companyId} not found`);
        }

        const baseSlug = slugify(row.title);
        const slug = `${baseSlug}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;

        const job = this.jobRepository.create({
          title: String(row.title).trim(),
          slug,
          description: String(row.description).trim(),
          requirements: String(row.requirements).trim(),
          benefits: row.benefits != null ? String(row.benefits).trim() : undefined,
          salary: row.salary != null ? String(row.salary).trim() : undefined,
          location: String(row.location).trim(),
          type: (row.type as JobType) ?? JobType.FULL_TIME,
          category: String(row.category).trim(),
          industry: row.industry ?? undefined,
          experience: row.experience != null ? Number(row.experience) : undefined,
          companyId,
          status: JobStatus.DRAFT,
          adminStatus: 'pending',
        });
        await this.jobRepository.save(job);
        successful++;
      } catch (e) {
        failed++;
        errorLog.push({
          row: rowNum,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    upload.successfulRecords = successful;
    upload.failedRecords = failed;
    upload.status = failed === total ? BulkUploadStatus.FAILED : BulkUploadStatus.COMPLETED;
    upload.errorLog = errorLog as any;
    upload.completedAt = new Date();
    await this.bulkUploadRepository.save(upload);

    return {
      uploadId: String(upload.id),
      status: upload.status,
      summary: {
        total,
        successful,
        failed,
        skipped: 0,
      },
      errors: errorLog,
    };
  }

  async getUploadStatus(id: string) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) {
      throw new NotFoundException('Invalid upload id');
    }
    const upload = await this.bulkUploadRepository.findOne({ where: { id: numId } });
    if (!upload) {
      throw new NotFoundException('Upload not found');
    }
    const total = upload.totalRecords ?? 0;
    const processed = (upload.successfulRecords ?? 0) + (upload.failedRecords ?? 0);
    const progress = total > 0 ? Math.round((processed / total) * 100) : 100;

    return {
      id: String(upload.id),
      status: upload.status,
      progress,
      summary: {
        total,
        processed,
        successful: upload.successfulRecords ?? 0,
        failed: upload.failedRecords ?? 0,
      },
      errors: (upload.errorLog as any[]) ?? [],
      createdAt: upload.createdAt?.toISOString?.(),
      completedAt: upload.completedAt?.toISOString?.(),
    };
  }

  async getUploadHistory(query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);

    const [uploads, total] = await this.bulkUploadRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      uploads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}



