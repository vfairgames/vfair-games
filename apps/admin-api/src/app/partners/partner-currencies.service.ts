import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePartnerCurrencyDto } from './dto/create-partner-currency.dto';
import type { UpdatePartnerCurrencyDto } from './dto/update-partner-currency.dto';
import { PartnerConfigCacheInvalidationService } from './partner-config-cache-invalidation.service';

type PartnerCurrencyItem = {
  id: number;
  partnerId: number;
  code: string;
  minBet: number;
  maxBet: number;
  maxWin: number;
  decimals: number;
  createdAt: Date;
  updatedAt: Date;
};

const PARTNER_CURRENCY_SELECT = {
  id: true,
  partnerId: true,
  code: true,
  minBet: true,
  maxBet: true,
  maxWin: true,
  decimals: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PartnerCurrencyRow = Prisma.PartnerCurrencyGetPayload<{
  select: typeof PARTNER_CURRENCY_SELECT;
}>;

const toPartnerCurrencyItem = (
  currency: PartnerCurrencyRow,
): PartnerCurrencyItem => ({
  id: currency.id,
  partnerId: currency.partnerId,
  code: currency.code,
  minBet: currency.minBet.toNumber(),
  maxBet: currency.maxBet.toNumber(),
  maxWin: currency.maxWin.toNumber(),
  decimals: currency.decimals,
  createdAt: currency.createdAt,
  updatedAt: currency.updatedAt,
});

@Injectable()
export class PartnerCurrenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerConfigCacheInvalidation: PartnerConfigCacheInvalidationService,
  ) {}

  async findAll(partnerId: number): Promise<PartnerCurrencyItem[]> {
    await this.assertPartnerExists(partnerId);
    const currencies = await this.prisma.partnerCurrency.findMany({
      where: { partnerId },
      select: PARTNER_CURRENCY_SELECT,
      orderBy: { code: 'asc' },
    });
    return currencies.map(toPartnerCurrencyItem);
  }

  async create(
    partnerId: number,
    dto: CreatePartnerCurrencyDto,
  ): Promise<PartnerCurrencyItem> {
    await this.assertPartnerExists(partnerId);
    this.assertBetLimits(dto.minBet, dto.maxBet);
    this.assertWinLimit(dto.maxBet, dto.maxWin);

    try {
      const currency = await this.prisma.partnerCurrency.create({
        data: {
          partnerId,
          code: dto.code,
          minBet: dto.minBet,
          maxBet: dto.maxBet,
          maxWin: dto.maxWin,
          decimals: dto.decimals,
        },
        select: PARTNER_CURRENCY_SELECT,
      });
      await this.partnerConfigCacheInvalidation.invalidateByPartnerId(
        partnerId,
      );
      return toPartnerCurrencyItem(currency);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          err_code: 'partner_currency_already_exists',
          message: 'This partner already has a config for this currency',
        });
      }
      throw error;
    }
  }

  async update(
    partnerId: number,
    currencyId: number,
    dto: UpdatePartnerCurrencyDto,
  ): Promise<PartnerCurrencyItem> {
    await this.assertPartnerExists(partnerId);

    const existing = await this.prisma.partnerCurrency.findFirst({
      where: { id: currencyId, partnerId },
      select: PARTNER_CURRENCY_SELECT,
    });

    if (!existing) {
      throw new NotFoundException({
        err_code: 'partner_currency_not_found',
        message: 'Partner currency config not found',
      });
    }

    if (
      dto.minBet === undefined &&
      dto.maxBet === undefined &&
      dto.maxWin === undefined &&
      dto.decimals === undefined
    ) {
      throw new BadRequestException({
        err_code: 'no_changes_provided',
        message: 'No changes provided',
      });
    }

    const minBet = dto.minBet ?? existing.minBet.toNumber();
    const maxBet = dto.maxBet ?? existing.maxBet.toNumber();
    const maxWin = dto.maxWin ?? existing.maxWin.toNumber();
    this.assertBetLimits(minBet, maxBet);
    this.assertWinLimit(maxBet, maxWin);

    const currency = await this.prisma.partnerCurrency.update({
      where: { id: currencyId },
      data: {
        ...(dto.minBet !== undefined ? { minBet: dto.minBet } : {}),
        ...(dto.maxBet !== undefined ? { maxBet: dto.maxBet } : {}),
        ...(dto.maxWin !== undefined ? { maxWin: dto.maxWin } : {}),
        ...(dto.decimals !== undefined ? { decimals: dto.decimals } : {}),
      },
      select: PARTNER_CURRENCY_SELECT,
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(partnerId);
    return toPartnerCurrencyItem(currency);
  }

  async remove(partnerId: number, currencyId: number): Promise<void> {
    await this.assertPartnerExists(partnerId);

    const existing = await this.prisma.partnerCurrency.findFirst({
      where: { id: currencyId, partnerId },
    });

    if (!existing) {
      throw new NotFoundException({
        err_code: 'partner_currency_not_found',
        message: 'Partner currency config not found',
      });
    }

    await this.prisma.partnerCurrency.delete({
      where: { id: currencyId },
    });
    await this.partnerConfigCacheInvalidation.invalidateByPartnerId(partnerId);
  }

  private async assertPartnerExists(partnerId: number): Promise<void> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, deletedAt: null },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }
  }

  private assertBetLimits(minBet: number, maxBet: number): void {
    if (maxBet < minBet) {
      throw new BadRequestException({
        err_code: 'max_bet_below_min_bet',
        message: 'maxBet must be greater than or equal to minBet',
      });
    }
  }

  private assertWinLimit(maxBet: number, maxWin: number): void {
    if (maxWin < maxBet) {
      throw new BadRequestException({
        err_code: 'max_win_below_max_bet',
        message: 'maxWin must be greater than or equal to maxBet',
      });
    }
  }
}
