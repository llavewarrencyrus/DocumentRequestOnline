import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, MoreThan, MoreThanOrEqual, LessThanOrEqual, Repository, Equal } from 'typeorm';
import { User, UserInvitation } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToClass } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserInvitation)
    private invitationsRepository: Repository<UserInvitation>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<{ token: string; }> {
    const username = createUserDto.username.toLocaleLowerCase();
    const existingUser = await this.usersRepository.findOne({
      where: { username: username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      passwordHash: 'INVITATION_PENDING',
      isActive: true,
    });
    const savedUser = await this.usersRepository.save(user);

    const token = uuidv4();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // 24 hour limit

    await this.invitationsRepository.save({
      userId: savedUser.id,
      token: token,
      expiresAt: expiry
    });

    // Email logic: Send https://yourapp.com/setup?token=${token}

    return { token };
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { username, isActive: true },
      select: ['id', 'username', 'passwordHash', 'role', 'office', 'departmentId', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async findByIdWithResponse(id: number): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return plainToClass(UserResponseDto, user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Don't allow updating certain fields
    const { username, ...updateData } = updateUserDto as any;

    Object.assign(user, updateData);
    const updatedUser = await this.usersRepository.save(user);
    return plainToClass(UserResponseDto, updatedUser);
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.usersRepository.update(id, { lastLogin: new Date() });
  }

  async changePassword(id: number, currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.usersRepository.findOne({ where: { id }, select: ['id', 'username', 'passwordHash', 'role', 'office', 'departmentId', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = newPassword;
    await this.usersRepository.save(user);
    return true;
  }

  private applyFilters(queryBuilder: any, options: {
    role?: string;
    isActive?: boolean;
    search?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
    createdFrom?: string;
    createdTo?: string;
  }): void {
    const { role, isActive, search, lastLoginFrom, lastLoginTo, createdFrom, createdTo } = options;

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere('user.username LIKE :search', { search: `%${search}%` });
    }

    // Date range filters for lastLogin
    if (lastLoginFrom || lastLoginTo) {
      if (lastLoginFrom && lastLoginTo) {
        queryBuilder.andWhere('user.lastLogin >= :lastLoginFrom', { lastLoginFrom: new Date(lastLoginFrom) });
        queryBuilder.andWhere('user.lastLogin <= :lastLoginTo', { lastLoginTo: new Date(lastLoginTo) });
      } else if (lastLoginFrom) {
        // When only lastLoginFrom is provided, filter for the entire day
        const startOfDay = new Date(lastLoginFrom);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(lastLoginFrom);
        endOfDay.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('user.lastLogin >= :lastLoginFrom', { lastLoginFrom: startOfDay });
        queryBuilder.andWhere('user.lastLogin <= :lastLoginTo', { lastLoginTo: endOfDay });
      } else if (lastLoginTo) {
        queryBuilder.andWhere('user.lastLogin <= :lastLoginTo', { lastLoginTo: new Date(lastLoginTo) });
      }
    }

    // Date range filters for createdAt
    if (createdFrom || createdTo) {
      if (createdFrom && createdTo) {
        queryBuilder.andWhere('user.createdAt >= :createdFrom', { createdFrom: new Date(createdFrom) });
        queryBuilder.andWhere('user.createdAt <= :createdTo', { createdTo: new Date(createdTo) });
      } else if (createdFrom) {
        // When only createdFrom is provided, filter for the entire day
        const startOfDay = new Date(createdFrom);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(createdFrom);
        endOfDay.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('user.createdAt >= :createdFrom', { createdFrom: startOfDay });
        queryBuilder.andWhere('user.createdAt <= :createdTo', { createdTo: endOfDay });
      } else if (createdTo) {
        queryBuilder.andWhere('user.createdAt <= :createdTo', { createdTo: new Date(createdTo) });
      }
    }
  }

  async findAll(options: {
    role?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    lastLoginFrom?: string;
    lastLoginTo?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{ items: UserResponseDto[]; meta: any; }> {
    const { role, isActive, search, page = 1, limit = 10, lastLoginFrom, lastLoginTo, createdFrom, createdTo } = options;
    const skip = (page - 1) * limit;

    // Build base query for stats (full dataset, no pagination)
    const statsQueryBuilder = this.usersRepository.createQueryBuilder('user');
    this.applyFilters(statsQueryBuilder, { role, isActive, search, lastLoginFrom, lastLoginTo, createdFrom, createdTo });

    // Execute stats query to get total and status counts
    const statsResult = await statsQueryBuilder
      .select([
        'COUNT(user.id) as total',
        "COUNT(CASE WHEN user.isActive = true THEN 1 END) as active",
        "COUNT(CASE WHEN user.isActive = false THEN 1 END) as inactive",
      ])
      .getRawOne();

    // Get role counts using aggregation
    const roleStatsResult = await this.usersRepository.createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('user.role');

    this.applyFilters(roleStatsResult, { role, isActive, search, lastLoginFrom, lastLoginTo, createdFrom, createdTo });

    const roleStatsData = await roleStatsResult.getRawMany();

    const roleCounts: Record<string, number> = {};
    roleStatsData.forEach(item => {
      roleCounts[item.role] = parseInt(item.count);
    });

    const totalItems = parseInt(statsResult.total);
    const activeCount = parseInt(statsResult.active);
    const inactiveCount = parseInt(statsResult.inactive);

    // Build query for paginated data using QueryBuilder
    const dataQueryBuilder = this.usersRepository.createQueryBuilder('user');
    this.applyFilters(dataQueryBuilder, { role, isActive, search, lastLoginFrom, lastLoginTo, createdFrom, createdTo });

    const users = await dataQueryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const items = users.map(user => plainToClass(UserResponseDto, user));

    return {
      items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        stats: {
          total: totalItems,
          active: activeCount,
          inactive: inactiveCount,
          roles: roleCounts,
        },
      },
    };
  }

  async deactivate(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.update(id, { isActive: false });
  }

  async activate(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.update(id, { isActive: true });
  }

  async findToken(id: number): Promise<{ token: string; }> {
    const invitation = await this.invitationsRepository.findOne({
      where: {
        userId: id,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date())
      },
      order: {
        createdAt: 'DESC'
      }
    });

    const token = invitation?.token || '';

    return { token };
  }

  async delete(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.softDelete(id);
  }

  async completeSetup(token: string, newPassword: string) {
    const invitation = await this.invitationsRepository.findOne({
      where: { token },
      relations: ['user']
    });

    if (!invitation) throw new NotFoundException('Invalid invitation link.');
    if (invitation.usedAt) throw new BadRequestException('This link has already been used.');
    if (new Date() > invitation.expiresAt) throw new BadRequestException('This link has expired.');

    const user = invitation.user;
    const isFirstTimeSetup = !user.lastLogin;
    user.passwordHash = newPassword;
    await this.usersRepository.save(user);

    invitation.usedAt = new Date();
    await this.invitationsRepository.save(invitation);

    return {
      message: isFirstTimeSetup ? 'Account setup successful' : 'Password reset successful',
      isFirstTimeSetup
    };
  }

  async generatePasswordToken(userId: number): Promise<{ token: string; }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingInvitation = await this.invitationsRepository.findOne({
      where: {
        userId: userId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date())
      },
      order: {
        createdAt: 'DESC'
      }
    });

    if (existingInvitation) {
      await this.invitationsRepository.update(
        { userId: userId, usedAt: IsNull() },
        { usedAt: new Date() }
      );
    }

    // Generate new token
    const token = uuidv4();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // 24 hour limit

    await this.invitationsRepository.save({
      userId: userId,
      token: token,
      expiresAt: expiry
    });

    return { token };
  }
}