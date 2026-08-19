import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BetResult } from '@vfair/game-contracts';
import { getAvailableGame } from '@vfair/game-contracts';
import type { Prisma } from '@vfair/prisma-client';
import {
  RoundStatus,
  WalletTxStatus,
  WalletTxType,
} from '@vfair/prisma-client';
import {
  InvalidRoundOutcomeError,
  mapFailedRoundFallback,
  mapGameRoundToBetResult,
} from './round.mapper';
import { roundDetailSelect } from './round.types';
import type { ListPlayerRoundsQueryDto } from './dto/list-player-rounds-query.dto';
import type { ListPlayerTransactionsQueryDto } from './dto/list-player-transactions-query.dto';
import type { PlayerKpiQueryDto } from './dto/player-kpi-query.dto';
import type { JwtPayload } from '../auth/jwt-payload';
import { assertDateRangeOrder } from '../kpi/assert-date-range-order';
import {
  endOfUtcDay,
  rollupDailyKpiRows,
  startOfUtcDay,
} from '../kpi/daily-kpi-rollup';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertPlayerBelongsToUser,
  resolveListPartnerId,
} from './player-access';
import { parseRoundId } from './parse-round-id';

const PLAYER_SELECT = {
  id: true,
  externalId: true,
  partnerId: true,
  createdAt: true,
  updatedAt: true,
  partner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const ROUND_LIST_SELECT = {
  id: true,
  gameId: true,
  status: true,
  betAmount: true,
  winAmount: true,
  currency: true,
  createdAt: true,
  outcome: true,
  partnerCurrency: {
    select: {
      decimals: true,
    },
  },
} as const;

const TRANSACTION_LIST_SELECT = {
  id: true,
  type: true,
  status: true,
  amount: true,
  balanceAfter: true,
  currency: true,
  roundId: true,
  requestId: true,
  createdAt: true,
  partnerCurrency: {
    select: {
      decimals: true,
    },
  },
} as const;

type AdminPlayerListItem = {
  id: number;
  externalId: string;
  partner: { id: number; name: string };
  createdAt: string;
};

type AdminPlayer = {
  id: number;
  externalId: string;
  partner: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
};

type AdminPlayerCurrencyOption = {
  code: string;
  decimals: number;
};

type AdminBetHistoryStatus = 'won' | 'lost' | 'active' | 'failed';

type AdminPlayerRoundListItem = {
  id: string;
  betAmount: number;
  winAmount: number;
  status: AdminBetHistoryStatus;
  gameId: string;
  gameName: string;
  multiplier: number | null;
  currency: { code: string; decimals: number };
  createdAt: string;
};

type AdminPlayerWalletTxListItem = {
  id: string;
  type: WalletTxType;
  status: WalletTxStatus;
  amount: number;
  balanceAfter: number | null;
  currency: { code: string; decimals: number };
  roundId: string | null;
  requestId: string;
  createdAt: string;
};

type AdminPlayerRoundDetail = Omit<BetResult, 'status'> & {
  status: AdminBetHistoryStatus;
  outcome: Prisma.JsonValue;
  requestId: string;
  settledAt: string | null;
  rtp: number;
};

const BET_HISTORY_STATUSES = [
  RoundStatus.WON,
  RoundStatus.LOST,
  RoundStatus.ACTIVE,
  RoundStatus.FAILED,
];

const BET_HISTORY_STATUS_FILTER: Record<
  Exclude<ListPlayerRoundsQueryDto['status'], undefined>,
  RoundStatus
> = {
  won: RoundStatus.WON,
  lost: RoundStatus.LOST,
  active: RoundStatus.ACTIVE,
  failed: RoundStatus.FAILED,
};

const mapAdminBetHistoryStatus = (
  status: RoundStatus,
): AdminBetHistoryStatus => {
  switch (status) {
    case RoundStatus.WON:
      return 'won';
    case RoundStatus.LOST:
      return 'lost';
    case RoundStatus.ACTIVE:
      return 'active';
    case RoundStatus.FAILED:
      return 'failed';
  }
};

type AdminPlayerKpi = {
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

const parseOutcomeMultiplier = (outcome: unknown): number | null => {
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
    return null;
  }

  const value = (outcome as Record<string, unknown>).multiplier;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const resolveBetHistoryStatusWhere = (
  status: ListPlayerRoundsQueryDto['status'],
): Prisma.EnumRoundStatusFilter =>
  status
    ? { equals: BET_HISTORY_STATUS_FILTER[status] }
    : { in: BET_HISTORY_STATUSES };

const buildRoundListWhere = (
  playerId: number,
  query: Pick<
    ListPlayerRoundsQueryDto,
    | 'gameId'
    | 'currency'
    | 'status'
    | 'dateFrom'
    | 'dateTo'
    | 'betAmountMin'
    | 'betAmountMax'
    | 'roundId'
  >,
) => {
  if (query.dateFrom && query.dateTo) {
    assertDateRangeOrder(query.dateFrom, query.dateTo);
  }

  const createdAt =
    query.dateFrom || query.dateTo
      ? {
          ...(query.dateFrom ? { gte: startOfUtcDay(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: endOfUtcDay(query.dateTo) } : {}),
        }
      : undefined;

  const betAmount =
    query.betAmountMin !== undefined || query.betAmountMax !== undefined
      ? {
          ...(query.betAmountMin !== undefined
            ? { gte: query.betAmountMin }
            : {}),
          ...(query.betAmountMax !== undefined
            ? { lte: query.betAmountMax }
            : {}),
        }
      : undefined;

  return {
    playerId,
    ...(query.gameId ? { gameId: query.gameId } : {}),
    ...(query.currency ? { currency: query.currency } : {}),
    ...(query.roundId ? { id: parseRoundId(query.roundId) } : {}),
    status: resolveBetHistoryStatusWhere(query.status),
    ...(createdAt ? { createdAt } : {}),
    ...(betAmount ? { betAmount } : {}),
  };
};

const WALLET_TX_TYPE_FILTER: Record<
  Exclude<ListPlayerTransactionsQueryDto['type'], undefined>,
  WalletTxType
> = {
  debit: WalletTxType.DEBIT,
  credit: WalletTxType.CREDIT,
  rollback: WalletTxType.ROLLBACK,
};

const WALLET_TX_STATUS_FILTER: Record<
  Exclude<ListPlayerTransactionsQueryDto['status'], undefined>,
  WalletTxStatus
> = {
  pending: WalletTxStatus.PENDING,
  confirmed: WalletTxStatus.CONFIRMED,
  failed: WalletTxStatus.FAILED,
  rolled_back: WalletTxStatus.ROLLED_BACK,
};

const buildTransactionListWhere = (
  playerId: number,
  query: ListPlayerTransactionsQueryDto,
): Prisma.WalletTransactionWhereInput => {
  if (query.dateFrom && query.dateTo) {
    assertDateRangeOrder(query.dateFrom, query.dateTo);
  }

  const type = query.type ? WALLET_TX_TYPE_FILTER[query.type] : undefined;
  const status = query.status
    ? WALLET_TX_STATUS_FILTER[query.status]
    : undefined;
  const createdAt =
    query.dateFrom || query.dateTo
      ? {
          ...(query.dateFrom ? { gte: startOfUtcDay(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: endOfUtcDay(query.dateTo) } : {}),
        }
      : undefined;

  const amount =
    query.amountMin !== undefined || query.amountMax !== undefined
      ? {
          ...(query.amountMin !== undefined ? { gte: query.amountMin } : {}),
          ...(query.amountMax !== undefined ? { lte: query.amountMax } : {}),
        }
      : undefined;

  return {
    playerId,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(query.currency ? { currency: query.currency } : {}),
    ...(query.roundId ? { roundId: parseRoundId(query.roundId) } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(amount ? { amount } : {}),
  };
};

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: JwtPayload,
    page: number,
    limit: number,
    externalId?: string,
    queryPartnerId?: number,
  ): Promise<{ data: AdminPlayerListItem[]; total: number }> {
    const partnerId = resolveListPartnerId(user, queryPartnerId);

    const where = {
      deletedAt: null,
      ...(partnerId ? { partnerId } : {}),
      ...(externalId
        ? {
            externalId: {
              contains: externalId,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        select: PLAYER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        externalId: row.externalId,
        partner: row.partner,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
    };
  }

  async findOne(user: JwtPayload, id: number): Promise<AdminPlayer> {
    const player = await this.prisma.player.findFirst({
      where: { id, deletedAt: null },
      select: PLAYER_SELECT,
    });

    if (!player) {
      throw new NotFoundException({
        err_code: 'player_not_found',
        message: 'Player not found',
      });
    }

    assertPlayerBelongsToUser(user, player.partnerId);

    return {
      id: player.id,
      externalId: player.externalId,
      partner: player.partner,
      createdAt: player.createdAt.toISOString(),
      updatedAt: player.updatedAt.toISOString(),
    };
  }

  async findCurrencies(
    user: JwtPayload,
    playerId: number,
  ): Promise<AdminPlayerCurrencyOption[]> {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, deletedAt: null },
      select: { partnerId: true },
    });

    if (!player) {
      throw new NotFoundException({
        err_code: 'player_not_found',
        message: 'Player not found',
      });
    }

    assertPlayerBelongsToUser(user, player.partnerId);

    const [rows, kpiCurrencyRows] = await Promise.all([
      this.prisma.partnerCurrency.findMany({
        where: { partnerId: player.partnerId },
        select: {
          code: true,
          decimals: true,
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.dailyKpi.findMany({
        where: {
          scope: 'PLAYER',
          playerId,
        },
        select: { currency: true },
        distinct: ['currency'],
      }),
    ]);

    const currenciesWithKpi = new Set(
      kpiCurrencyRows.map((row) => row.currency),
    );

    return [...rows].sort((a, b) => {
      const aRank = currenciesWithKpi.has(a.code) ? 0 : 1;
      const bRank = currenciesWithKpi.has(b.code) ? 0 : 1;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return a.code.localeCompare(b.code);
    });
  }

  async findKpi(
    user: JwtPayload,
    playerId: number,
    query: PlayerKpiQueryDto,
  ): Promise<AdminPlayerKpi> {
    assertDateRangeOrder(query.dateFrom, query.dateTo);

    const player = await this.prisma.player.findFirst({
      where: { id: playerId, deletedAt: null },
      select: { id: true, partnerId: true },
    });

    if (!player) {
      throw new NotFoundException({
        err_code: 'player_not_found',
        message: 'Player not found',
      });
    }

    assertPlayerBelongsToUser(user, player.partnerId);

    const partnerCurrency = await this.prisma.partnerCurrency.findUnique({
      where: {
        partnerId_code: {
          partnerId: player.partnerId,
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
        message: `Currency "${query.currency}" is not configured for this player's partner`,
      });
    }

    const rows = await this.prisma.dailyKpi.findMany({
      where: {
        scope: 'PLAYER',
        playerId,
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

    const rollup = rollupDailyKpiRows(rows);

    return {
      currency: {
        code: partnerCurrency.code,
        decimals: partnerCurrency.decimals,
      },
      ...rollup,
    };
  }

  async findTransactions(
    user: JwtPayload,
    playerId: number,
    query: ListPlayerTransactionsQueryDto,
  ): Promise<{ data: AdminPlayerWalletTxListItem[]; hasMore: boolean }> {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, deletedAt: null },
      select: { id: true, partnerId: true },
    });

    if (!player) {
      throw new NotFoundException({
        err_code: 'player_not_found',
        message: 'Player not found',
      });
    }

    assertPlayerBelongsToUser(user, player.partnerId);

    const where = buildTransactionListWhere(playerId, query);

    const rows = await this.prisma.walletTransaction.findMany({
      where,
      select: TRANSACTION_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      data: pageRows.map((row) => ({
        id: row.id.toString(),
        type: row.type,
        status: row.status,
        amount: row.amount.toNumber(),
        balanceAfter: row.balanceAfter?.toNumber() ?? null,
        currency: {
          code: row.currency,
          decimals: row.partnerCurrency.decimals,
        },
        roundId: row.roundId?.toString() ?? null,
        requestId: row.requestId,
        createdAt: row.createdAt.toISOString(),
      })),
      hasMore,
    };
  }

  async findRounds(
    user: JwtPayload,
    playerId: number,
    query: ListPlayerRoundsQueryDto,
  ): Promise<{ data: AdminPlayerRoundListItem[]; hasMore: boolean }> {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, deletedAt: null },
      select: { id: true, partnerId: true },
    });

    if (!player) {
      throw new NotFoundException({
        err_code: 'player_not_found',
        message: 'Player not found',
      });
    }

    assertPlayerBelongsToUser(user, player.partnerId);

    const where = buildRoundListWhere(playerId, query);

    const rows = await this.prisma.gameRound.findMany({
      where,
      select: ROUND_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      data: pageRows.map((row) => {
        const game = getAvailableGame(row.gameId);

        return {
          id: row.id.toString(),
          betAmount: row.betAmount.toNumber(),
          winAmount: row.winAmount?.toNumber() ?? 0,
          status: mapAdminBetHistoryStatus(row.status),
          gameId: row.gameId,
          gameName: game?.name ?? row.gameId,
          multiplier: parseOutcomeMultiplier(row.outcome),
          currency: {
            code: row.currency,
            decimals: row.partnerCurrency.decimals,
          },
          createdAt: row.createdAt.toISOString(),
        };
      }),
      hasMore,
    };
  }

  async findRound(
    user: JwtPayload,
    playerId: number,
    roundId: bigint,
  ): Promise<AdminPlayerRoundDetail> {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, deletedAt: null },
      select: { id: true, partnerId: true },
    });

    if (!player) {
      throw new NotFoundException({
        err_code: 'player_not_found',
        message: 'Player not found',
      });
    }

    assertPlayerBelongsToUser(user, player.partnerId);

    const round = await this.prisma.gameRound.findFirst({
      where: {
        id: roundId,
        playerId,
        status: {
          in: BET_HISTORY_STATUSES,
        },
      },
      select: roundDetailSelect,
    });

    if (!round) {
      throw new NotFoundException({
        err_code: 'round_not_found',
        message: 'Round not found',
      });
    }

    const toDetail = (betResult: BetResult): AdminPlayerRoundDetail => ({
      ...betResult,
      status: mapAdminBetHistoryStatus(round.status),
      outcome: round.outcome,
      requestId: round.requestId,
      settledAt: round.settledAt?.toISOString() ?? null,
      rtp: round.rtp.toNumber(),
    });

    try {
      if (round.status === RoundStatus.FAILED) {
        return toDetail(mapFailedRoundFallback(round));
      }

      return toDetail(mapGameRoundToBetResult(round));
    } catch (error: unknown) {
      if (error instanceof InvalidRoundOutcomeError) {
        throw new NotFoundException({
          err_code: 'round_not_found',
          message: 'Round not found',
        });
      }

      throw error;
    }
  }
}
