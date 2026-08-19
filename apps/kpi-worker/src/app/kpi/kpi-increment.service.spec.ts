jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@vfair/prisma-client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(
      message: string,
      options: { code: string; clientVersion: string },
    ) {
      super(message);
      this.code = options.code;
    }
  }

  class Decimal {
    private readonly value: number;

    constructor(value: string | number) {
      this.value = Number(value);
    }

    minus(other: Decimal): Decimal {
      return new Decimal(this.value - other.value);
    }

    toString(): string {
      return String(this.value);
    }
  }

  return {
    KpiScope: {
      PLAYER: 'PLAYER',
      PARTNER: 'PARTNER',
      GLOBAL: 'GLOBAL',
    },
    RoundStatus: {
      ACTIVE: 'ACTIVE',
      WON: 'WON',
      LOST: 'LOST',
      FAILED: 'FAILED',
    },
    Prisma: {
      PrismaClientKnownRequestError,
      Decimal,
    },
  };
});

import type { GameRoundSettledEvent } from '@vfair/game-contracts';
import { GAME_ROUND_SETTLED_EVENT, DICE_GAME_ID } from '@vfair/game-contracts';
import { KpiScope, Prisma, RoundStatus } from '@vfair/prisma-client';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from '../prisma/prisma.service';
import { KpiIncrementService } from './kpi-increment.service';

const event: GameRoundSettledEvent = {
  event: GAME_ROUND_SETTLED_EVENT,
  roundId: '42',
  playerId: 7,
  partnerId: 1,
  gameId: DICE_GAME_ID,
  currency: 'USD',
  betAmount: '10',
  winAmount: '0',
  status: RoundStatus.LOST,
  settledAt: '2026-07-09T15:30:00.000Z',
};

describe('KpiIncrementService', () => {
  let prisma: {
    $transaction: jest.Mock;
  };
  let tx: {
    kpiProcessedRound: { create: jest.Mock };
    dailyKpi: { upsert: jest.Mock };
    dailyKpiGame: { upsert: jest.Mock };
  };
  let logger: { info: jest.Mock; error: jest.Mock };
  let service: KpiIncrementService;

  beforeEach(() => {
    tx = {
      kpiProcessedRound: {
        create: jest.fn().mockResolvedValue({ roundId: BigInt(42) }),
      },
      dailyKpi: {
        upsert: jest.fn().mockResolvedValue({ id: 100 }),
      },
      dailyKpiGame: {
        upsert: jest.fn().mockResolvedValue({ id: 200 }),
      },
    };

    prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    service = new KpiIncrementService(
      logger as unknown as PinoLogger,
      prisma as unknown as PrismaService,
    );
  });

  it('increments player, partner, and global KPI rows plus per-game rows', async () => {
    const processed = await service.processSettledRound(event);

    expect(processed).toBe(true);
    expect(tx.kpiProcessedRound.create).toHaveBeenCalledWith({
      data: { roundId: BigInt(42) },
    });
    expect(tx.dailyKpi.upsert).toHaveBeenCalledTimes(3);
    expect(tx.dailyKpiGame.upsert).toHaveBeenCalledTimes(3);

    expect(tx.dailyKpi.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          date_scope_partnerId_playerId_currency: expect.objectContaining({
            scope: KpiScope.PLAYER,
            partnerId: 1,
            playerId: 7,
            currency: 'USD',
          }),
        },
        create: expect.objectContaining({
          totalBets: 1,
          scope: KpiScope.PLAYER,
        }),
        update: expect.objectContaining({
          totalBets: { increment: 1 },
        }),
      }),
    );

    expect(tx.dailyKpi.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          date_scope_partnerId_playerId_currency: expect.objectContaining({
            scope: KpiScope.PARTNER,
            partnerId: 1,
            playerId: 0,
          }),
        },
      }),
    );

    expect(tx.dailyKpi.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: {
          date_scope_partnerId_playerId_currency: expect.objectContaining({
            scope: KpiScope.GLOBAL,
            partnerId: 0,
            playerId: 0,
          }),
        },
      }),
    );

    expect(tx.dailyKpiGame.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dailyKpiId_gameId: {
            dailyKpiId: 100,
            gameId: DICE_GAME_ID,
          },
        },
      }),
    );
  });

  it('skips increments when the round was already processed', async () => {
    tx.kpiProcessedRound.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const processed = await service.processSettledRound(event);

    expect(processed).toBe(false);
    expect(tx.dailyKpi.upsert).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      { roundId: '42' },
      'Skipping already processed round',
    );
  });
});
