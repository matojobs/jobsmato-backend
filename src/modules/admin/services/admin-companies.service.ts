import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company, CompanySize } from '../../../entities/company.entity';
import { User } from '../../../entities/user.entity';
import { Job } from '../../../entities/job.entity';

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company';
}

export interface GetCompaniesQuery {
  page?: number;
  limit?: number;
  search?: string;
  adminStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface GetCompaniesResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCompanyDto {
  userId: number;
  name: string;
  slug?: string;
  description?: string;
  website?: string;
  logo?: string;
  industry?: string;
  size?: CompanySize;
  location?: string;
  foundedYear?: number;
}

export interface UpdateCompanyDto {
  name?: string;
  description?: string;
  website?: string;
  logo?: string;
  industry?: string;
  size?: CompanySize;
  location?: string;
  foundedYear?: number;
  adminNotes?: string;
}

@Injectable()
export class AdminCompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private dataSource: DataSource,
  ) {}

  async getCompanies(query: GetCompaniesQuery): Promise<GetCompaniesResponse> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const search = query.search?.trim();
    const adminStatus = query.adminStatus;
    const sortField = query.sortBy ?? query.sort_by ?? 'createdAt';
    const sortDir = (query.sortOrder ?? query.sort_order ?? 'desc').toLowerCase() as 'asc' | 'desc';
    const sortByMapped = sortField === 'created_at' ? 'createdAt' : sortField === 'updated_at' ? 'updatedAt' : sortField;

    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.user', 'user')
      .orderBy(`company.${sortByMapped}`, sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.slug ILIKE :search OR company.industry ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (adminStatus) {
      qb.andWhere('company.adminStatus = :adminStatus', { adminStatus });
    }

    const [companies, total] = await qb.getManyAndCount();

    return {
      companies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCompany(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async createCompany(dto: CreateCompanyDto) {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const existingForUser = await this.companyRepository.findOne({ where: { userId: dto.userId } });
    if (existingForUser) {
      throw new ConflictException('User already has a company');
    }
    let slug = dto.slug?.trim() || slugify(dto.name);
    let attempt = 0;
    while (await this.companyRepository.findOne({ where: { slug } })) {
      slug = `${slugify(dto.name)}-${++attempt}`;
    }
    const company = this.companyRepository.create({
      userId: dto.userId,
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim(),
      website: dto.website?.trim(),
      logo: dto.logo?.trim(),
      industry: dto.industry?.trim(),
      size: dto.size,
      location: dto.location?.trim(),
      foundedYear: dto.foundedYear,
      adminStatus: 'pending',
    });
    await this.companyRepository.save(company);
    return { success: true, company };
  }

  async updateCompany(id: number, dto: UpdateCompanyDto) {
    const company = await this.getCompany(id);
    if (dto.name !== undefined) company.name = dto.name.trim();
    if (dto.description !== undefined) company.description = dto.description?.trim() ?? null;
    if (dto.website !== undefined) company.website = dto.website?.trim() ?? null;
    if (dto.logo !== undefined) company.logo = dto.logo?.trim() ?? null;
    if (dto.industry !== undefined) company.industry = dto.industry?.trim() ?? null;
    if (dto.size !== undefined) company.size = dto.size;
    if (dto.location !== undefined) company.location = dto.location?.trim() ?? null;
    if (dto.foundedYear !== undefined) company.foundedYear = dto.foundedYear ?? null;
    if (dto.adminNotes !== undefined) company.adminNotes = dto.adminNotes?.trim() ?? null;
    await this.companyRepository.save(company);
    return { success: true, company };
  }

  async deleteCompany(id: number) {
    const company = await this.getCompany(id);
    const jobCount = await this.jobRepository.count({ where: { companyId: id } });
    if (jobCount > 0) {
      throw new BadRequestException(
        `Cannot delete company with ${jobCount} job(s). Remove or reassign jobs first.`,
      );
    }
    // Remove sourcing data that references this company (applications -> job_roles -> company)
    await this.dataSource.transaction(async (tx) => {
      const jobRoleIds = await tx.query(
        `SELECT id FROM sourcing.job_roles WHERE company_id = $1`,
        [id],
      );
      const ids = jobRoleIds.map((r: { id: number }) => r.id);
      if (ids.length > 0) {
        await tx.query(
          `DELETE FROM sourcing.applications WHERE job_role_id = ANY($1::int[])`,
          [ids],
        );
        await tx.query(`DELETE FROM sourcing.job_roles WHERE company_id = $1`, [id]);
      }
      await tx.delete(Company, { id });
    });
    return { success: true, message: 'Company deleted successfully' };
  }

  async updateCompanyStatus(id: number, status: string, adminNotes?: string, adminId?: number) {
    const company = await this.getCompany(id);
    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Use one of: ${validStatuses.join(', ')}`);
    }
    company.adminStatus = status;
    if (adminNotes !== undefined) company.adminNotes = adminNotes;
    company.adminReviewedAt = new Date();
    if (adminId != null) company.adminReviewedBy = adminId;
    await this.companyRepository.save(company);
    return { success: true, company };
  }

  async verifyCompany(id: number, adminId?: number) {
    const company = await this.getCompany(id);
    company.adminVerified = true;
    company.adminStatus = 'approved';
    company.adminReviewedAt = new Date();
    if (adminId != null) company.adminReviewedBy = adminId;
    await this.companyRepository.save(company);
    return { success: true, company };
  }
}



