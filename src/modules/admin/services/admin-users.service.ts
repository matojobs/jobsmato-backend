import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, MoreThanOrEqual } from 'typeorm';
import { User, UserRole, UserStatus } from '../../../entities/user.entity';

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
  ) {}

  async getUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<GetUsersResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC')
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

    // Prevent deleting admin users (you might want to add more restrictions)
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin users');
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
