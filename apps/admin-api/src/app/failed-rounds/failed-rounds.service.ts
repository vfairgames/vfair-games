import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getAvailableGame, type BetFailureStage } from '@vfair/game-contracts';
import {
  FailedRoundEventAction,
  Prisma,
  RoundStatus,
} from '@vfair/prisma-client';
import type { JwtPayload } from '../auth/jwt-payload';
import { parsePositiveInt } from '../common/positive-int-id';
import { assertDateRangeOrder } from '../kpi/assert-date-range-order';
import { endOfUtcDay, startOfUtcDay } from '../kpi/daily-kpi-rollup';
import { mapFailedRoundFallback } from '../players/round.mapper';
import { roundDetailSelect } from '../players/round.types';
import { resolveListPartnerId } from '../players/player-access';
import { parseRoundId } from '../players/parse-round-id';
import { PrismaService } from '../prisma/prisma.service';
import type { ListFailedRoundsQueryDto } from './dto/list-failed-rounds-query.dto';
import { readErrCode, readFailureStage } from './failed-round-eligibility';

const FAILED_ROUND_EVENT_SELECT = {
  id: true,
  action: true,
  note: true,
  createdAt: true,
  createdByUser: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

const FAILED_ROUND_LIST_SELECT = {
  id: true,
  gameId: true,
  betAmount: true,
  currency: true,
  outcome: true,
  settledAt: true,
  player: {
    select: {
      id: true,
      externalId: true,
    },
  },
  partner: {
    select: {
      id: true,
      name: true,
    },
  },
  partnerCurrency: {
    select: {
      decimals: true,
    },
  },
  failedRoundEvents: {
    select: {
      action: true,
    },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
  },
} satisfies Prisma.GameRoundSelect;

const FAILED_ROUND_DETAIL_SELECT = {
  ...roundDetailSelect,
  payoutMultiplier: true,
  updatedAt: true,
  player: {
    select: {
      id: true,
      externalId: true,
    },
  },
  partner: {
    select: {
      id: true,
      name: true,
    },
  },
  failedRoundEvents: {
    select: FAILED_ROUND_EVENT_SELECT,
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
  },
  transactions: {
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
      currency: true,
      partnerTransactionId: true,
      requestId: true,
      reversesTransactionId: true,
      createdAt: true,
      updatedAt: true,
      partnerCurrency: {
        select: {
          decimals: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.GameRoundSelect;

type AdminFailedRoundSolved = {
  note: string;
  solvedAt: string;
  solvedBy: { id: number; email: string };
};

type AdminFailedRoundListItem = {
  id: string;
  player: { id: number; externalId: string };
  partner: { id: number; name: string };
  gameId: string;
  gameName: string;
  betAmount: number;
  currency: { code: string; decimals: number };
  failureStage: BetFailureStage | null;
  errCode: string | null;
  settledAt: string | null;
  solved: boolean;
};

type LatestFailedRoundEvent = {
  action: FailedRoundEventAction;
  note: string;
  createdAt: Date;
  createdByUser: { id: number; email: string };
};

@Injectable()
export class FailedRoundsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: JwtPayload,
    query: ListFailedRoundsQueryDto,
  ): Promise<{ data: AdminFailedRoundListItem[]; hasMore: boolean }> {
    if (query.dateFrom && query.dateTo) {
      assertDateRangeOrder(query.dateFrom, query.dateTo);
    }

    const partnerId = resolveListPartnerId(user, query.partnerId);
    const skip = (query.page - 1) * query.limit;
    const take = query.limit + 1;

    const pageRows =
      query.solved === undefined
        ? await this.findPageWithoutSolvedFilter(partnerId, query, skip, take)
        : await this.findPageWithSolvedFilter(partnerId, query, skip, take);

    const hasMore = pageRows.length > query.limit;
    const rows = hasMore ? pageRows.slice(0, query.limit) : pageRows;

    return {
      data: rows.map((row) => {
        const failureStage = readFailureStage(row.outcome);
        const game = getAvailableGame(row.gameId);
        const latestEvent = row.failedRoundEvents[0];

        return {
          id: row.id.toString(),
          player: row.player,
          partner: row.partner,
          gameId: row.gameId,
          gameName: game?.name ?? row.gameId,
          betAmount: row.betAmount.toNumber(),
          currency: {
            code: row.currency,
            decimals: row.partnerCurrency.decimals,
          },
          failureStage,
          errCode: readErrCode(row.outcome),
          settledAt: row.settledAt?.toISOString() ?? null,
          solved: latestEvent?.action === FailedRoundEventAction.SOLVED,
        };
      }),
      hasMore,
    };
  }

  async findOne(user: JwtPayload, roundId: bigint) {
    const partnerId = resolveListPartnerId(user);
    const round = await this.prisma.gameRound.findFirst({
      where: {
        id: roundId,
        status: RoundStatus.FAILED,
        ...(partnerId ? { partnerId } : {}),
      },
      select: FAILED_ROUND_DETAIL_SELECT,
    });

    if (!round) {
      throw new NotFoundException({
        err_code: 'failed_round_not_found',
        message: 'Failed round not found',
      });
    }

    return this.mapDetail(round);
  }

  async markSolved(user: JwtPayload, roundId: bigint, note: string) {
    const partnerId = resolveListPartnerId(user);
    const createdByUserId = parsePositiveInt(user.sub, 'user id');

    const round = await this.findFailedRoundForMutation(roundId, partnerId);

    if (this.isCurrentlySolved(round.failedRoundEvents[0])) {
      throw new ConflictException({
        err_code: 'failed_round_already_solved',
        message: 'Failed round is already solved',
      });
    }

    await this.prisma.failedRoundEvent.create({
      data: {
        roundId,
        action: FailedRoundEventAction.SOLVED,
        note,
        createdByUserId,
      },
    });

    return this.findOne(user, roundId);
  }

  async markUnsolved(user: JwtPayload, roundId: bigint, note: string) {
    const partnerId = resolveListPartnerId(user);
    const createdByUserId = parsePositiveInt(user.sub, 'user id');

    const round = await this.findFailedRoundForMutation(roundId, partnerId);

    if (!this.isCurrentlySolved(round.failedRoundEvents[0])) {
      throw new ConflictException({
        err_code: 'failed_round_not_solved',
        message: 'Failed round is not solved',
      });
    }

    await this.prisma.failedRoundEvent.create({
      data: {
        roundId,
        action: FailedRoundEventAction.UNSOLVED,
        note,
        createdByUserId,
      },
    });

    return this.findOne(user, roundId);
  }

  private async findFailedRoundForMutation(
    roundId: bigint,
    partnerId: number | undefined,
  ) {
    const round = await this.prisma.gameRound.findFirst({
      where: {
        id: roundId,
        status: RoundStatus.FAILED,
        ...(partnerId ? { partnerId } : {}),
      },
      select: {
        id: true,
        failedRoundEvents: {
          select: {
            action: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    if (!round) {
      throw new NotFoundException({
        err_code: 'failed_round_not_found',
        message: 'Failed round not found',
      });
    }

    return round;
  }

  private mapDetail(
    round: Prisma.GameRoundGetPayload<{
      select: typeof FAILED_ROUND_DETAIL_SELECT;
    }>,
  ) {
    const betResult = mapFailedRoundFallback(round);
    const game = getAvailableGame(round.gameId);
    const latestEvent = round.failedRoundEvents[0] ?? null;

    return {
      id: round.id.toString(),
      status: round.status,
      player: round.player,
      partner: round.partner,
      gameId: round.gameId,
      gameName: game?.name ?? round.gameId,
      betAmount: round.betAmount.toNumber(),
      winAmount: round.winAmount?.toNumber() ?? null,
      payoutMultiplier: round.payoutMultiplier?.toNumber() ?? null,
      balanceAfter: round.balanceAfter?.toNumber() ?? null,
      currency: {
        code: round.currency,
        decimals: round.partnerCurrency.decimals,
      },
      nonce: round.nonce,
      rtp: round.rtp.toNumber(),
      requestId: round.requestId,
      failureStage: readFailureStage(round.outcome),
      errCode: readErrCode(round.outcome),
      outcome: round.outcome,
      gameData: betResult.gameData,
      fairness: betResult.fairness,
      createdAt: round.createdAt.toISOString(),
      updatedAt: round.updatedAt.toISOString(),
      settledAt: round.settledAt?.toISOString() ?? null,
      solved: this.mapSolved(latestEvent),
      events: round.failedRoundEvents.map((event) => ({
        id: event.id,
        action: event.action,
        note: event.note,
        createdAt: event.createdAt.toISOString(),
        createdBy: {
          id: event.createdByUser.id,
          email: event.createdByUser.email,
        },
      })),
      transactions: round.transactions.map((transaction) => ({
        id: transaction.id.toString(),
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount.toNumber(),
        balanceBefore: transaction.balanceBefore?.toNumber() ?? null,
        balanceAfter: transaction.balanceAfter?.toNumber() ?? null,
        currency: {
          code: transaction.currency,
          decimals: transaction.partnerCurrency.decimals,
        },
        partnerTransactionId: transaction.partnerTransactionId,
        requestId: transaction.requestId,
        reversesTransactionId:
          transaction.reversesTransactionId?.toString() ?? null,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      })),
    };
  }

  private mapSolved(
    latestEvent: LatestFailedRoundEvent | null,
  ): AdminFailedRoundSolved | null {
    if (!this.isCurrentlySolved(latestEvent) || !latestEvent) {
      return null;
    }

    return {
      note: latestEvent.note,
      solvedAt: latestEvent.createdAt.toISOString(),
      solvedBy: {
        id: latestEvent.createdByUser.id,
        email: latestEvent.createdByUser.email,
      },
    };
  }

  private isCurrentlySolved(
    latestEvent: { action: FailedRoundEventAction } | null | undefined,
  ): boolean {
    return latestEvent?.action === FailedRoundEventAction.SOLVED;
  }

  private async findPageWithoutSolvedFilter(
    partnerId: number | undefined,
    query: ListFailedRoundsQueryDto,
    skip: number,
    take: number,
  ) {
    return this.prisma.gameRound.findMany({
      where: this.buildListWhere(partnerId, query),
      select: FAILED_ROUND_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    });
  }

  private async findPageWithSolvedFilter(
    partnerId: number | undefined,
    query: ListFailedRoundsQueryDto,
    skip: number,
    take: number,
  ) {
    const ids = await this.findPageIds(partnerId, query, skip, take);

    if (ids.length === 0) {
      return [];
    }

    const unordered = await this.prisma.gameRound.findMany({
      where: { id: { in: ids } },
      select: FAILED_ROUND_LIST_SELECT,
    });
    const byId = new Map(unordered.map((row) => [row.id, row]));

    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }

  private buildListWhere(
    partnerId: number | undefined,
    query: ListFailedRoundsQueryDto,
  ): Prisma.GameRoundWhereInput {
    const createdAt =
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom ? { gte: startOfUtcDay(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: endOfUtcDay(query.dateTo) } : {}),
          }
        : undefined;

    return {
      status: RoundStatus.FAILED,
      ...(partnerId ? { partnerId } : {}),
      ...(query.playerId ? { playerId: query.playerId } : {}),
      ...(query.externalId
        ? {
            player: {
              externalId: {
                contains: query.externalId,
                mode: 'insensitive',
              },
            },
          }
        : {}),
      ...(query.roundId ? { id: parseRoundId(query.roundId) } : {}),
      ...(query.requestId
        ? {
            OR: [
              { requestId: query.requestId },
              {
                transactions: {
                  some: { requestId: query.requestId },
                },
              },
            ],
          }
        : {}),
      ...(query.gameId ? { gameId: query.gameId } : {}),
      ...(query.failureStage
        ? {
            outcome: {
              path: ['failure_stage'],
              equals: query.failureStage,
            },
          }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };
  }

  private async findPageIds(
    partnerId: number | undefined,
    query: ListFailedRoundsQueryDto,
    skip: number,
    take: number,
  ): Promise<bigint[]> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`gr."status" = CAST(${RoundStatus.FAILED} AS "RoundStatus")`,
    ];

    if (partnerId !== undefined) {
      conditions.push(Prisma.sql`gr."partnerId" = ${partnerId}`);
    }

    if (query.playerId !== undefined) {
      conditions.push(Prisma.sql`gr."playerId" = ${query.playerId}`);
    }

    if (query.externalId) {
      conditions.push(
        Prisma.sql`p."externalId" ILIKE ${`%${query.externalId}%`}`,
      );
    }

    if (query.roundId) {
      conditions.push(Prisma.sql`gr."id" = ${parseRoundId(query.roundId)}`);
    }

    if (query.requestId) {
      conditions.push(Prisma.sql`(
        gr."requestId" = ${query.requestId}
        OR EXISTS (
          SELECT 1
          FROM "WalletTransaction" wt
          WHERE wt."roundId" = gr."id"
            AND wt."requestId" = ${query.requestId}
        )
      )`);
    }

    if (query.gameId) {
      conditions.push(Prisma.sql`gr."gameId" = ${query.gameId}`);
    }

    if (query.failureStage) {
      conditions.push(
        Prisma.sql`gr."outcome"->>'failure_stage' = ${query.failureStage}`,
      );
    }

    if (query.dateFrom) {
      conditions.push(
        Prisma.sql`gr."createdAt" >= ${startOfUtcDay(query.dateFrom)}`,
      );
    }

    if (query.dateTo) {
      conditions.push(
        Prisma.sql`gr."createdAt" <= ${endOfUtcDay(query.dateTo)}`,
      );
    }

    if (query.solved === true) {
      conditions.push(Prisma.sql`(
        SELECT e."action"
        FROM "FailedRoundEvent" e
        WHERE e."roundId" = gr."id"
        ORDER BY e."createdAt" DESC, e."id" DESC
        LIMIT 1
      ) = CAST(${FailedRoundEventAction.SOLVED} AS "FailedRoundEventAction")`);
    } else if (query.solved === false) {
      conditions.push(Prisma.sql`(
        SELECT e."action"
        FROM "FailedRoundEvent" e
        WHERE e."roundId" = gr."id"
        ORDER BY e."createdAt" DESC, e."id" DESC
        LIMIT 1
      ) IS DISTINCT FROM CAST(${FailedRoundEventAction.SOLVED} AS "FailedRoundEventAction")`);
    }

    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      SELECT gr."id"
      FROM "GameRound" gr
      ${
        query.externalId
          ? Prisma.sql`INNER JOIN "Player" p ON p."id" = gr."playerId"`
          : Prisma.empty
      }
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY gr."createdAt" DESC, gr."id" DESC
      OFFSET ${skip}
      LIMIT ${take}
    `);

    return rows.map((row) => row.id);
  }
}
