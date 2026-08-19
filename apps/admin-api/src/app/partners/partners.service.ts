import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePartnerDto } from './dto/create-partner.dto';
import type { UpdatePartnerDto } from './dto/update-partner.dto';
import { normalizeIpWhitelist } from './ip-whitelist';
import {
  partnerCodeFallback,
  partnerCodeRandomFallback,
  partnerNameToCode,
  resolveUniquePartnerCode,
} from './partner-code';
import { generatePartnerSecret } from './partner-secret';
import { PartnerConfigCacheInvalidationService } from './partner-config-cache-invalidation.service';

type PartnerRecord = {
  id: number;
  name: string;
  code: string;
  lobbyUrl: string | null;
  webhookUrl: string | null;
  secret: string;
  ipWhitelist: string;
  createdAt: Date;
  updatedAt: Date;
};

type PartnerListItem = Omit<PartnerRecord, 'secret' | 'ipWhitelist'> & {
  usersCount: number;
};

type PartnerListResult = {
  data: PartnerListItem[];
  total: number;
};

const PARTNER_LIST_SELECT = {
  id: true,
  name: true,
  code: true,
  lobbyUrl: true,
  webhookUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PARTNER_DETAIL_SELECT = {
  ...PARTNER_LIST_SELECT,
  secret: true,
  ipWhitelist: true,
} as const;

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerConfigCacheInvalidation: PartnerConfigCacheInvalidationService,
  ) {}

  async findAll(
    page: number,
    limit: number,
    name?: string,
  ): Promise<PartnerListResult> {
    const where = {
      deletedAt: null,
      ...(name
        ? { name: { contains: name, mode: 'insensitive' as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        select: {
          ...PARTNER_LIST_SELECT,
          _count: {
            select: {
              users: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    const data = rows.map(({ _count, ...partner }) => ({
      ...partner,
      usersCount: _count.users,
    }));

    return { data, total };
  }

  async findOne(id: number): Promise<PartnerRecord> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
      select: PARTNER_DETAIL_SELECT,
    });
    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }
    return partner;
  }

  async create(dto: CreatePartnerDto): Promise<PartnerRecord> {
    const existing = await this.prisma.partner.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        err_code: 'partner_name_already_exists',
        message: 'A partner with this name already exists',
      });
    }

    const baseCode = partnerNameToCode(dto.name);
    if (baseCode) {
      const code = await resolveUniquePartnerCode(baseCode, (candidate) =>
        this.isCodeTaken(candidate),
      );
      return this.prisma.partner.create({
        data: { name: dto.name, code, secret: generatePartnerSecret() },
        select: PARTNER_DETAIL_SELECT,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          name: dto.name,
          code: partnerCodeRandomFallback(),
          secret: generatePartnerSecret(),
        },
      });
      const code = await resolveUniquePartnerCode(
        partnerCodeFallback(partner.id),
        (candidate) => this.isCodeTaken(candidate, partner.id, tx),
      );
      return tx.partner.update({
        where: { id: partner.id },
        data: { code },
        select: PARTNER_DETAIL_SELECT,
      });
    });
  }

  async update(id: number, dto: UpdatePartnerDto): Promise<PartnerRecord> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }
    const nameConflict = await this.prisma.partner.findFirst({
      where: { name: dto.name, deletedAt: null, NOT: { id } },
    });
    if (nameConflict) {
      throw new ConflictException({
        err_code: 'partner_name_already_exists',
        message: 'A partner with this name already exists',
      });
    }

    let normalizedIpWhitelist: string | undefined;
    if (dto.ipWhitelist !== undefined) {
      try {
        normalizedIpWhitelist = normalizeIpWhitelist(dto.ipWhitelist);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Invalid IP whitelist';
        throw new BadRequestException({
          err_code: 'invalid_ip_whitelist',
          message,
        });
      }
    }

    const updatedPartner = await this.prisma.partner.update({
      where: { id },
      data: {
        name: dto.name,
        ...(dto.lobbyUrl !== undefined && {
          lobbyUrl: dto.lobbyUrl?.trim() ? dto.lobbyUrl.trim() : null,
        }),
        ...(dto.webhookUrl !== undefined && {
          webhookUrl: dto.webhookUrl?.trim() ? dto.webhookUrl.trim() : null,
        }),
        ...(normalizedIpWhitelist !== undefined && {
          ipWhitelist: normalizedIpWhitelist,
        }),
      },
      select: PARTNER_DETAIL_SELECT,
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(id);
    return updatedPartner;
  }

  async regenerateSecret(id: number): Promise<PartnerRecord> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
    });
    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    const updatedPartner = await this.prisma.partner.update({
      where: { id },
      data: { secret: generatePartnerSecret() },
      select: PARTNER_DETAIL_SELECT,
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(id);
    return updatedPartner;
  }

  async remove(id: number): Promise<void> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...PARTNER_LIST_SELECT,
        _count: {
          select: {
            users: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }
    if (partner._count.users > 0) {
      throw new BadRequestException({
        err_code: 'cannot_delete_partner_with_users',
        message: 'Cannot delete a partner that has users',
      });
    }
    await this.prisma.partner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(id);
  }

  private async isCodeTaken(
    code: string,
    excludeId?: number,
    db: Pick<PrismaService, 'partner'> = this.prisma,
  ): Promise<boolean> {
    const conflict = await db.partner.findFirst({
      where: {
        code,
        deletedAt: null,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
    });
    return conflict !== null;
  }
}
