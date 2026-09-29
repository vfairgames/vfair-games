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
    private readonly value: string;

    constructor(value: string | number) {
      this.value = String(value);
    }

    toString(): string {
      return this.value;
    }
  }

  return {
    RoundStatus: {
      ACTIVE: 'ACTIVE',
      WON: 'WON',
      LOST: 'LOST',
      FAILED: 'FAILED',
    },
    Prisma: {
      PrismaClientKnownRequestError,
      Decimal,
      sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
      }),
    },
  };
});

import { DICE_GAME_ID } from '@vfair/game-contracts';
import { Prisma, RoundStatus } from '@vfair/prisma-client';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PrismaService } from '../prisma/prisma.service';
import { KpiOutboxReconcilerService } from './kpi-outbox-reconciler.service';

describe('KpiOutboxReconcilerService', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  it('enqueues outbox rows for settled rounds missing from KPI', async () => {
    const create = jest.fn().mockResolvedValue({ id: BigInt(1) });
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: BigInt(42),
          playerId: 7,
          partnerId: 1,
          gameId: DICE_GAME_ID,
          currency: 'USD',
          betAmount: new Prisma.Decimal('1'),
          winAmount: new Prisma.Decimal('0'),
          status: RoundStatus.LOST,
          settledAt: new Date('2026-01-15T12:00:00.000Z'),
        },
      ]),
      $transaction: jest.fn(
        async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({ kpiOutbox: { create } }),
      ),
    } as unknown as PrismaService;

    const reconciler = new KpiOutboxReconcilerService(logger, prisma);
    await expect(reconciler.reconcileBatch()).resolves.toBe(1);

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: {
        roundId: BigInt(42),
        payload: expect.objectContaining({
          roundId: '42',
          status: RoundStatus.LOST,
          gameId: DICE_GAME_ID,
        }),
      },
    });
  });

  it('sends old rows again when KPI never processed them', async () => {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(2),
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const reconciler = new KpiOutboxReconcilerService(logger, prisma);
    await expect(reconciler.reconcileBatch()).resolves.toBe(2);

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ count: 2 }),
      'KPI check will send old unprocessed rows again',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns zero when nothing is missing', async () => {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const reconciler = new KpiOutboxReconcilerService(logger, prisma);
    await expect(reconciler.reconcileBatch()).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
