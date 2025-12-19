import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { User } from '../../entities/user.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, userId: number): Promise<Company> {
    // Generate slug from name
    const slug = createCompanyDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Handle null logo - convert to undefined for TypeORM
    const { logo, ...restDto } = createCompanyDto;
    const companyData = {
      ...restDto,
      logo: logo === null ? undefined : logo,
      slug,
      userId,
    };

    const company = this.companyRepository.create(companyData);

    return await this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    // Load companies without user relation to avoid schema mismatch
    const companies = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.jobs', 'jobs')
      .getMany();

    // Load users separately with explicit column selection (excluding googleId)
    const userIds = companies.map(c => c.userId).filter(id => id);
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.email',
          'user.phone',
          'user.location',
          'user.avatar',
          'user.role',
          'user.status',
          'user.createdAt',
          'user.updatedAt',
        ])
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      // Map users to companies
      const userMap = new Map(users.map(u => [u.id, u]));
      companies.forEach(company => {
        company.user = userMap.get(company.userId);
      });
    }

    return companies;
  }

  async findOne(id: number): Promise<Company> {
    // Load company without user relation to avoid schema mismatch
    const company = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.jobs', 'jobs')
      .where('company.id = :id', { id })
      .getOne();

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Load user separately with explicit column selection (excluding googleId)
    if (company.userId) {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.email',
          'user.phone',
          'user.location',
          'user.avatar',
          'user.role',
          'user.status',
          'user.createdAt',
          'user.updatedAt',
        ])
        .where('user.id = :userId', { userId: company.userId })
        .getOne();

      company.user = user || undefined;
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto, userId: number): Promise<Company> {
    const company = await this.findOne(id);

    // Check if user owns the company or is admin
    if (company.userId !== userId) {
      throw new ForbiddenException('You can only update your own company');
    }

    // Handle null logo - TypeORM can handle null for nullable columns
    const { logo, ...restDto } = updateCompanyDto;
    const updateData: any = {
      ...restDto,
    };
    
    // Explicitly set logo if provided (including null)
    if (logo !== undefined) {
      updateData.logo = logo;
    }

    Object.assign(company, updateData);
    return await this.companyRepository.save(company);
  }

  async remove(id: number, userId: number): Promise<void> {
    const company = await this.findOne(id);

    // Check if user owns the company or is admin
    if (company.userId !== userId) {
      throw new ForbiddenException('You can only delete your own company');
    }

    await this.companyRepository.remove(company);
  }
}
