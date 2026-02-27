import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThanOrEqual, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../../entities/user.entity';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  location?: string;
}

export interface GetUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  /** When true, recruiter can post jobs for any company on the job portal. Only relevant for role recruiter. */
  canPostForAnyCompany?: boolean;
}

export interface SuspendUserRequest {
  reason: string;
  duration?: number; // in days
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async createUser(data: CreateUserRequest): Promise<{ success: boolean; user: User }> {
    const { email, password, firstName, lastName, role, phone, location } = data;

    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException('Invalid role. Use: job_seeker, employer, recruiter, admin');
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userData: DeepPartial<User> = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role as UserRole,
      phone: phone ?? undefined,
      location: location ?? undefined,
      status: UserStatus.ACTIVE,
      isActive: true,
      onboardingComplete: false,
    };
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user) as User;

    if (role === UserRole.RECRUITER) {
      await this.dataSource.query(
        `INSERT INTO sourcing.recruiters (name, email, phone, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [`${firstName} ${lastName}`.trim(), email, phone || null],
      );
    }

    const { password: _, ...userWithoutPassword } = savedUser;
    return {
      success: true,
      user: userWithoutPassword as User,
    };
  }

  async getUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<GetUsersResponse> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const search = query.search;
    const role = query.role;
    const status = query.status;
    // Accept both camelCase (sortBy, sortOrder) and snake_case (sort_by, sort_order)
    const sortField = query.sortBy ?? query.sort_by ?? 'createdAt';
    const sortDir = (query.sortOrder ?? query.sort_order ?? 'desc').toLowerCase() as 'asc' | 'desc';
    // Map common snake_case sort fields to User entity property names (camelCase)
    const sortByMapped = sortField === 'created_at' ? 'createdAt' : sortField === 'updated_at' ? 'updatedAt' : sortField;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .orderBy(`user.${sortByMapped}`, sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: number, updateData: UpdateUserRequest): Promise<{ success: boolean; user: User }> {
    const user = await this.getUser(id);

    // Validate email uniqueness if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateData.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Validate role if provided
    if (updateData.role && !Object.values(UserRole).includes(updateData.role as UserRole)) {
      throw new BadRequestException('Invalid role');
    }

    // Update user
    Object.assign(user, updateData);
    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      user: updatedUser,
    };
  }

  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    const user = await this.getUser(id);

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin users');
    }

    // Block delete if user owns companies (companies.userId FK would violate)
    const ownedCompanies = await this.dataSource.query(
      'SELECT id, name FROM companies WHERE "userId" = $1',
      [id],
    );
    if (ownedCompanies.length > 0) {
      throw new ConflictException(
        `Cannot delete user: they own ${ownedCompanies.length} company(ies) (e.g. "${ownedCompanies[0].name}"). Reassign or delete the companies first, then delete the user.`,
      );
    }

    await this.userRepository.remove(user);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async verifyUser(id: number): Promise<{ success: boolean; user: User }> {
    const user = await this.getUser(id);

    user.isVerified = true;
    user.verificationToken = null as any;
    user.verificationExpiresAt = null as any;

    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      user: updatedUser,
    };
  }

  async suspendUser(id: number, suspendData: SuspendUserRequest): Promise<{ success: boolean; user: User }> {
    const user = await this.getUser(id);

    // Prevent suspending admin users
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot suspend admin users');
    }

    user.status = UserStatus.SUSPENDED;
    user.isActive = false;

    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      user: updatedUser,
    };
  }

  async activateUser(id: number): Promise<{ success: boolean; user: User }> {
    const user = await this.getUser(id);

    user.status = UserStatus.ACTIVE;
    user.isActive = true;

    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      user: updatedUser,
    };
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    verifiedUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      verifiedUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
      this.userRepository.count({ where: { isVerified: true } }),
      this.userRepository.count({ where: { createdAt: MoreThanOrEqual(today) } }),
      this.userRepository.count({ where: { createdAt: MoreThanOrEqual(weekAgo) } }),
      this.userRepository.count({ where: { createdAt: MoreThanOrEqual(monthAgo) } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      verifiedUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    };
  }
}
