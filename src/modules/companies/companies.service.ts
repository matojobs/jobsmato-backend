import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CompanyMember, CompanyMemberRole } from '../../entities/company-member.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CompanyMember)
    private companyMemberRepository: Repository<CompanyMember>,
  ) { }

  /**
   * True if the user can manage this company (owner, member, or recruiter with canPostForAnyCompany).
   */
  async canUserAccessCompany(userId: number, companyId: number): Promise<boolean> {
    const company = await this.companyRepository.findOne({ where: { id: companyId }, select: ['id', 'userId'] });
    if (!company) return false;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'canPostForAnyCompany'],
    });
    if (user?.role === UserRole.RECRUITER && user.canPostForAnyCompany) return true;
    if (company.userId === userId) return true;
    const member = await this.companyMemberRepository.findOne({ where: { companyId, userId } });
    return !!member;
  }

  /**
   * Company IDs the user can manage (primary owner first, then memberships).
   */
  async getCompanyIdsForUser(userId: number): Promise<number[]> {
    const primary = await this.companyRepository.find({ where: { userId }, select: ['id'] });
    const memberRows = await this.companyMemberRepository.find({ where: { userId }, select: ['companyId'] });
    const ids = new Set<number>(primary.map(c => c.id));
    memberRows.forEach(m => ids.add(m.companyId));
    const primaryIds = primary.map(c => c.id);
    const rest = [...ids].filter(id => !primaryIds.includes(id));
    return [...primaryIds, ...rest];
  }

  /**
   * Companies the user can manage (for job portal company selector).
   * Recruiters with canPostForAnyCompany get all companies; others get owned + member companies.
   */
  async getCompaniesForUser(userId: number): Promise<Company[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'canPostForAnyCompany'],
    });
    if (user?.role === UserRole.RECRUITER && user.canPostForAnyCompany) {
      return this.companyRepository.find({ order: { name: 'ASC' } });
    }
    const companyIds = await this.getCompanyIdsForUser(userId);
    if (!companyIds.length) return [];
    return this.companyRepository.find({
      where: companyIds.map(id => ({ id })),
      order: { name: 'ASC' },
    });
  }

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

    const company = await this.companyRepository.save(this.companyRepository.create(companyData));
    await this.companyMemberRepository.save(
      this.companyMemberRepository.create({ companyId: company.id, userId, role: CompanyMemberRole.OWNER }),
    );
    return company;
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
    if (!(await this.canUserAccessCompany(userId, id))) {
      throw new ForbiddenException('You can only update a company you have access to');
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
    if (!(await this.canUserAccessCompany(userId, id))) {
      throw new ForbiddenException('You can only delete a company you have access to');
    }
    await this.companyRepository.remove(company);
  }

  async getMembers(companyId: number, requestingUserId: number): Promise<{ id: number; userId: number; role: string; user?: { id: number; firstName: string; lastName: string; email: string } }[]> {
    if (!(await this.canUserAccessCompany(requestingUserId, companyId))) {
      throw new ForbiddenException('You do not have access to this company');
    }
    const members = await this.companyMemberRepository.find({
      where: { companyId },
      order: { role: 'ASC', createdAt: 'ASC' },
    });
    const userIds = [...new Set(members.map(m => m.userId))];
    const users = userIds.length
      ? await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.firstName', 'user.lastName', 'user.email'])
        .where('user.id IN (:...userIds)', { userIds })
        .getMany()
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));
    const list = members.map(m => {
      const u = userMap.get(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: u ? { id: u.id, firstName: u.firstName, lastName: u.lastName ?? '', email: u.email } : undefined,
      };
    });
    const company = await this.companyRepository.findOne({ where: { id: companyId }, select: ['userId'] });
    if (company?.userId && !members.some(m => m.userId === company.userId)) {
      const ownerUser = await this.userRepository.findOne({ where: { id: company.userId }, select: ['id', 'firstName', 'lastName', 'email'] });
      list.unshift({
        id: 0,
        userId: company.userId,
        role: CompanyMemberRole.OWNER,
        user: ownerUser ? { id: ownerUser.id, firstName: ownerUser.firstName, lastName: ownerUser.lastName!, email: ownerUser.email } : undefined,
      });
    }
    return list;
  }

  async addMember(companyId: number, requestingUserId: number, dto: AddCompanyMemberDto): Promise<CompanyMember> {
    if (!(await this.canUserAccessCompany(requestingUserId, companyId))) {
      throw new ForbiddenException('You do not have access to this company');
    }
    const existing = await this.companyMemberRepository.findOne({ where: { companyId, userId: requestingUserId } });
    const company = await this.companyRepository.findOne({ where: { id: companyId }, select: ['userId'] });
    const isOwner = company?.userId === requestingUserId || existing?.role === CompanyMemberRole.OWNER;
    const isAdmin = existing?.role === CompanyMemberRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only owners and admins can add members');
    }
    if (dto.role === CompanyMemberRole.OWNER && !(company?.userId === requestingUserId)) {
      throw new ForbiddenException('Only the company owner can assign the owner role');
    }
    let targetUserId: number;
    if (dto.userId) {
      targetUserId = dto.userId;
    } else if (dto.email) {
      const user = await this.userRepository.findOne({ where: { email: dto.email }, select: ['id'] });
      if (!user) throw new NotFoundException(`User with email ${dto.email} not found`);
      targetUserId = user.id;
    } else {
      throw new BadRequestException('Provide either userId or email');
    }
    const existingMember = await this.companyMemberRepository.findOne({ where: { companyId, userId: targetUserId } });
    if (existingMember) {
      existingMember.role = dto.role;
      return this.companyMemberRepository.save(existingMember);
    }
    const companyOwnerId = company?.userId;
    if (dto.role === CompanyMemberRole.OWNER && companyOwnerId != null) {
      throw new BadRequestException('Company already has an owner (use company primary owner)');
    }
    return this.companyMemberRepository.save(
      this.companyMemberRepository.create({ companyId, userId: targetUserId, role: dto.role }),
    );
  }
}
