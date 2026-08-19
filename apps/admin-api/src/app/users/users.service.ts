import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RoleName } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  role: { select: { id: true, name: true } },
  partner: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  lastAccessAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    email?: string,
    partnerId?: number,
    roleId?: number,
  ) {
    const where = {
      deletedAt: null,
      ...(email
        ? { email: { contains: email, mode: 'insensitive' as const } }
        : {}),
      ...(partnerId ? { partnerId } : {}),
      ...(roleId ? { roleId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException({
        err_code: 'user_not_found',
        message: 'User not found',
      });
    }
    return user;
  }

  async findSignIns(id: number, page: number, limit: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException({
        err_code: 'user_not_found',
        message: 'User not found',
      });
    }

    const where = {
      OR: [{ userId: user.id }, { email: user.email }],
    };

    const [data, total] = await Promise.all([
      this.prisma.userSignIn.findMany({
        where,
        select: {
          id: true,
          email: true,
          ipAddress: true,
          userAgent: true,
          success: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userSignIn.count({ where }),
    ]);

    return { data, total };
  }

  async findAllRoles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        err_code: 'email_already_exists',
        message: 'A user with this email already exists',
      });
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new BadRequestException({
        err_code: 'role_not_found',
        message: 'Role not found',
      });
    }

    this.validatePartnerIdForRole(role.name as RoleName, dto.partnerId);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        roleId: dto.roleId,
        partnerId: dto.partnerId ?? null,
      },
      select: USER_SELECT,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException({
        err_code: 'user_not_found',
        message: 'User not found',
      });
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, deletedAt: null, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException({
          err_code: 'email_already_exists',
          message: 'A user with this email already exists',
        });
      }
    }

    let roleName = user.role.name as RoleName;
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new BadRequestException({
          err_code: 'role_not_found',
          message: 'Role not found',
        });
      }
      roleName = role.name as RoleName;
    }

    const newPartnerId =
      dto.partnerId !== undefined ? dto.partnerId : user.partnerId;
    this.validatePartnerIdForRole(roleName, newPartnerId);

    const data: Record<string, unknown> = {};
    if (dto.email) data['email'] = dto.email;
    if (dto.password) data['password'] = await bcrypt.hash(dto.password, 10);
    if (dto.roleId) data['roleId'] = dto.roleId;
    if (dto.partnerId !== undefined) data['partnerId'] = dto.partnerId;

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async remove(id: number): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException({
        err_code: 'user_not_found',
        message: 'User not found',
      });
    }
    if (user.role.name === RoleName.ADMIN) {
      throw new BadRequestException({
        err_code: 'cannot_delete_admin_user',
        message: 'Cannot delete a user with the ADMIN role',
      });
    }
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  validatePartnerIdForRole(
    roleName: RoleName,
    partnerId: number | null | undefined,
  ): void {
    if (roleName === RoleName.PARTNER && !partnerId) {
      throw new BadRequestException({
        err_code: 'partner_role_requires_partner_id',
        message: 'Users with the PARTNER role must have a partnerId',
      });
    }
    if (roleName === RoleName.ADMIN && partnerId) {
      throw new BadRequestException({
        err_code: 'admin_role_forbids_partner_id',
        message: 'Users with the ADMIN role must not have a partnerId',
      });
    }
  }
}
