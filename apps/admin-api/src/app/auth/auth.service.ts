import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Permission } from '@vfair/prisma-client';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { parsePositiveInt } from '../common/positive-int-id';
import { PrismaService } from '../prisma/prisma.service';
import type { SignInDto } from './dto/sign-in.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { extractRequestMeta, type SignInRequest } from './extract-request-meta';
import type { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signIn(
    dto: SignInDto,
    req: SignInRequest,
  ): Promise<{ accessToken: string }> {
    const meta = extractRequestMeta(req);

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    const passwordValid =
      !!user && (await bcrypt.compare(dto.password, user.password));

    if (!passwordValid || !user) {
      await this.recordSignIn({
        email: dto.email,
        userId: user?.id ?? null,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        success: false,
      });
      throw new UnauthorizedException({
        err_code: 'invalid_credentials',
        message: 'Invalid credentials',
      });
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.userSignIn.create({
        data: {
          email: dto.email,
          userId: user.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          success: true,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastAccessAt: now },
      }),
    ]);

    const payload = this.buildJwtPayload(user);

    return { accessToken: this.jwt.sign(payload) };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<{ accessToken: string } & JwtPayload> {
    if (!dto.email && !dto.password) {
      throw new BadRequestException({
        err_code: 'no_changes_provided',
        message: 'No changes provided',
      });
    }

    const parsedUserId = parsePositiveInt(userId, 'user id');
    const user = await this.prisma.user.findFirst({
      where: { id: parsedUserId, deletedAt: null },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        err_code: 'unauthorized',
        message: 'Unauthorized',
      });
    }

    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException({
          err_code: 'current_password_required',
          message: 'Current password is required',
        });
      }

      const currentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        user.password,
      );

      if (!currentPasswordValid) {
        throw new UnauthorizedException({
          err_code: 'current_password_incorrect',
          message: 'Current password is incorrect',
        });
      }
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          deletedAt: null,
          NOT: { id: parsedUserId },
        },
      });

      if (conflict) {
        throw new ConflictException({
          err_code: 'email_already_exists',
          message: 'A user with this email already exists',
        });
      }
    }

    const data: Record<string, unknown> = {};

    if (dto.email && dto.email !== user.email) {
      data['email'] = dto.email;
    }

    if (dto.password) {
      data['password'] = await bcrypt.hash(dto.password, 10);
    }

    const updated =
      Object.keys(data).length > 0
        ? await this.prisma.user.update({
            where: { id: parsedUserId },
            data,
            include: {
              role: {
                include: { permissions: true },
              },
            },
          })
        : user;

    const payload = this.buildJwtPayload(updated);
    return { accessToken: this.jwt.sign(payload), ...payload };
  }

  private buildJwtPayload(user: {
    id: number;
    email: string;
    partnerId: number | null;
    role: {
      name: JwtPayload['role'];
      permissions: { permission: Permission; granted: boolean }[];
    };
  }): JwtPayload {
    const permissions = user.role.permissions.reduce(
      (acc, rolePermission) => {
        acc[rolePermission.permission] = rolePermission.granted;
        return acc;
      },
      {} as Record<Permission, boolean>,
    );

    return {
      sub: String(user.id),
      email: user.email,
      role: user.role.name,
      partnerId: user.partnerId,
      permissions,
    };
  }

  private async recordSignIn(data: {
    email: string;
    userId: number | null;
    ipAddress: string | null;
    userAgent: string | null;
    success: boolean;
  }): Promise<void> {
    try {
      await this.prisma.userSignIn.create({ data });
    } catch (error: unknown) {
      this.logger.error(
        {
          error,
          email: data.email,
        },
        'Failed to record sign-in attempt',
      );
    }
  }
}
