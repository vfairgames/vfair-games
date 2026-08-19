import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';
import { assertDateRangeOrder } from '../kpi/assert-date-range-order';
import { rollupDailyKpiRows, startOfUtcDay } from '../kpi/daily-kpi-rollup';
import { PrismaService } from '../prisma/prisma.service';
import { resolveDashboardPartnerId } from './dashboard-access';
import type { DashboardKpiQueryDto } from './dto/dashboard-kpi-query.dto';

type DashboardCurrencyOption = {
  code: string;
  decimals: number;
};

type DashboardMeta = {
  partner: { id: number; name: string };
  currencies: DashboardCurrencyOption[];
  playerCount: number;
  enabledGameCount: number;
};

type DashboardKpi = {
  currency: { code: string; decimals: number };
  summary: {
    totalWagered: number;
    totalWon: number;
    ggr: number;
    totalBets: number;
    avgBet: number | null;
    playerRtp: number | null;
  };
  daily: {
    date: string;
    totalWagered: number;
    totalWon: number;
    ggr: number;
    totalBets: number;
  }[];
  games: {
    gameId: string;
    gameName: string;
    totalWagered: number;
    totalWon: number;
    ggr: number;
    totalBets: number;
    playerRtp: number | null;
  }[];
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeta(
    user: JwtPayload,
    queryPartnerId?: number,
  ): Promise<DashboardMeta> {
    const partnerId = resolveDashboardPartnerId(user, queryPartnerId);
    const partner = await this.findActivePartner(partnerId);

    const [currencies, kpiCurrencyRows, playerCount, enabledGameCount] =
      await Promise.all([
        this.prisma.partnerCurrency.findMany({
          where: { partnerId },
          select: {
            code: true,
            decimals: true,
          },
          orderBy: { code: 'asc' },
        }),
        this.prisma.dailyKpi.findMany({
          where: {
            scope: 'PARTNER',
            partnerId,
          },
          select: { currency: true },
          distinct: ['currency'],
        }),
        this.prisma.player.count({
          where: { partnerId, deletedAt: null },
        }),
        this.prisma.partnerGame.count({
          where: { partnerId, enabled: true },
        }),
      ]);

    const currenciesWithKpi = new Set(
      kpiCurrencyRows.map((row) => row.currency),
    );

    const orderedCurrencies = [...currencies].sort((a, b) => {
      const aRank = currenciesWithKpi.has(a.code) ? 0 : 1;
      const bRank = currenciesWithKpi.has(b.code) ? 0 : 1;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return a.code.localeCompare(b.code);
    });

    return {
      partner: {
        id: partner.id,
        name: partner.name,
      },
      currencies: orderedCurrencies,
      playerCount,
      enabledGameCount,
    };
  }

  async getKpi(
    user: JwtPayload,
    query: DashboardKpiQueryDto,
  ): Promise<DashboardKpi> {
    assertDateRangeOrder(query.dateFrom, query.dateTo);

    const partnerId = resolveDashboardPartnerId(user, query.partnerId);
    await this.findActivePartner(partnerId);

    const partnerCurrency = await this.prisma.partnerCurrency.findUnique({
      where: {
        partnerId_code: {
          partnerId,
          code: query.currency,
        },
      },
      select: {
        code: true,
        decimals: true,
      },
    });

    if (!partnerCurrency) {
      throw new BadRequestException({
        err_code: 'currency_not_configured',
        message: `Currency "${query.currency}" is not configured for this partner`,
      });
    }

    const rows = await this.prisma.dailyKpi.findMany({
      where: {
        scope: 'PARTNER',
        partnerId,
        playerId: 0,
        currency: query.currency,
        date: {
          gte: startOfUtcDay(query.dateFrom),
          lte: startOfUtcDay(query.dateTo),
        },
      },
      include: {
        games: true,
      },
      orderBy: { date: 'asc' },
    });

    return {
      currency: {
        code: partnerCurrency.code,
        decimals: partnerCurrency.decimals,
      },
      ...rollupDailyKpiRows(rows),
    };
  }

  private async findActivePartner(
    partnerId: number,
  ): Promise<{ id: number; name: string }> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, deletedAt: null },
      select: {
        id: true,
        name: true,
      },
    });

    if (!partner) {
      throw new NotFoundException({
        err_code: 'partner_not_found',
        message: 'Partner not found',
      });
    }

    return partner;
  }
}
